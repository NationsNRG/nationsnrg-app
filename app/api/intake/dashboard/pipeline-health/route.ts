import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

type HealthStatus = "healthy" | "warning" | "critical";

interface DealRow {
  id: string;
  business_name: string | null;
  status: string | null;
  created_at: string | null;
}

interface ProgressionEventRow {
  deal_id: string | null;
  created_at: string | null;
  should_update: boolean | null;
  updated: boolean | null;
}

interface StaleDeal {
  id: string;
  business_name: string | null;
  status: string | null;
  created_at: string | null;
  last_activity_at: string | null;
  risk_reason: string;
  risk_score: number;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function stageSlaDays(status: string | null): number {
  switch (status) {
    case "new":
      return 3;
    case "blocked":
      return 14;
    case "supplier_engaged":
    case "pricing_requested":
      return 7;
    case "quoted":
    case "proposal_sent":
      return 5;
    case "package_ready":
      return 10;
    default:
      return 14;
  }
}

function calculateRiskScore(params: {
  status: string | null;
  ageDays: number;
  inactiveDays: number;
  hasProgression: boolean;
}): number {
  let score = 0;

  if (!params.hasProgression) score += 25;
  if (params.inactiveDays > stageSlaDays(params.status)) score += 35;
  if (params.ageDays > 30) score += 15;
  if (params.status === "blocked") score += 15;
  if (params.status === "new" && params.ageDays > 7) score += 10;

  return Math.min(score, 100);
}

function getRiskReason(params: {
  status: string | null;
  inactiveDays: number;
  hasProgression: boolean;
}): string {
  if (!params.hasProgression) return "No automation progression recorded";
  if (params.status === "blocked") return "Deal is blocked and requires operator action";
  if (params.inactiveDays > stageSlaDays(params.status)) {
    return `No meaningful movement within ${stageSlaDays(params.status)} day SLA`;
  }

  return "Pipeline activity is aging";
}

function differenceInDays(dateValue: string | null): number {
  if (!dateValue) return 999;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 999;

  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireApiRole(request, ["admin", "operator"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = getServiceClient();

    const recentCutoff = daysAgo(2);

    const [
      { data: activeDeals, error: activeDealsError },
      { data: progressionEvents, error: progressionEventsError },
      { count: recentlyProgressed, error: recentProgressionError },
      { count: successfulProgressions, error: successfulProgressionsError },
      { count: attemptedProgressions, error: attemptedProgressionsError },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("id,business_name,status,created_at")
        .not("status", "in", "(won,lost)")
        .limit(1000),

      supabase
        .from("deal_auto_progression_events")
        .select("deal_id,created_at,should_update,updated")
        .order("created_at", { ascending: false })
        .limit(5000),

      supabase
        .from("deal_auto_progression_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", recentCutoff),

      supabase
        .from("deal_auto_progression_events")
        .select("id", { count: "exact", head: true })
        .eq("updated", true)
        .gte("created_at", daysAgo(7)),

      supabase
        .from("deal_auto_progression_events")
        .select("id", { count: "exact", head: true })
        .eq("should_update", true)
        .gte("created_at", daysAgo(7)),
    ]);

    if (activeDealsError) throw new Error(activeDealsError.message);
    if (progressionEventsError) throw new Error(progressionEventsError.message);
    if (recentProgressionError) throw new Error(recentProgressionError.message);
    if (successfulProgressionsError) throw new Error(successfulProgressionsError.message);
    if (attemptedProgressionsError) throw new Error(attemptedProgressionsError.message);

    const deals = (activeDeals ?? []) as DealRow[];
    const events = (progressionEvents ?? []) as ProgressionEventRow[];

    const latestEventByDealId = new Map<string, ProgressionEventRow>();

    for (const event of events) {
      if (!event.deal_id) continue;
      if (!latestEventByDealId.has(event.deal_id)) {
        latestEventByDealId.set(event.deal_id, event);
      }
    }

    const scoredDeals: StaleDeal[] = deals.map((deal) => {
      const latestEvent = latestEventByDealId.get(deal.id);
      const lastActivityAt = latestEvent?.created_at ?? deal.created_at;
      const ageDays = differenceInDays(deal.created_at);
      const inactiveDays = differenceInDays(lastActivityAt);
      const hasProgression = Boolean(latestEvent);

      const riskScore = calculateRiskScore({
        status: deal.status,
        ageDays,
        inactiveDays,
        hasProgression,
      });

      return {
        id: deal.id,
        business_name: deal.business_name,
        status: deal.status,
        created_at: deal.created_at,
        last_activity_at: lastActivityAt,
        risk_reason: getRiskReason({
          status: deal.status,
          inactiveDays,
          hasProgression,
        }),
        risk_score: riskScore,
      };
    });

    const staleDeals = scoredDeals.filter((deal) => deal.risk_score >= 50);
    const blockedDeals = deals.filter((deal) => deal.status === "blocked").length;
    const totalDeals = deals.length;

    const staleRatio = totalDeals > 0 ? staleDeals.length / totalDeals : 0;
    const automationSuccessRate =
      attemptedProgressions && attemptedProgressions > 0
        ? Math.round(((successfulProgressions ?? 0) / attemptedProgressions) * 100)
        : 100;

    const healthScore = Math.max(
      0,
      Math.round(
        100 -
          staleRatio * 45 -
          (blockedDeals / Math.max(totalDeals, 1)) * 25 -
          (100 - automationSuccessRate) * 0.3,
      ),
    );

    let healthStatus: HealthStatus = "healthy";

    if (healthScore < 60 || staleRatio >= 0.6) {
      healthStatus = "critical";
    } else if (healthScore < 80 || staleRatio >= 0.3) {
      healthStatus = "warning";
    }

    return NextResponse.json({
      ok: true,
      signal: {
        totalDeals,
        recentlyUpdated: recentlyProgressed ?? 0,
        staleDeals: staleDeals.length,
        healthScore,
        healthStatus,
        blockedDeals,
        automationSuccessRate,
        attemptedProgressions: attemptedProgressions ?? 0,
        successfulProgressions: successfulProgressions ?? 0,
        staleList: staleDeals
          .sort((a, b) => b.risk_score - a.risk_score)
          .slice(0, 5),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}