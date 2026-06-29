import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

interface DealHealthRow {
  id: string;
  business_name: string | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function staleCutoffForStatus(status: string | null): string {
  if (status === "new") return daysAgo(7);
  if (status === "blocked") return daysAgo(14);

  if (
    status === "supplier_engaged" ||
    status === "pricing_requested" ||
    status === "quoted" ||
    status === "proposal_sent" ||
    status === "package_ready"
  ) {
    return daysAgo(21);
  }

  return daysAgo(30);
}

function getActivityDate(deal: DealHealthRow): string | null {
  return deal.updated_at ?? deal.created_at;
}

function isDealStale(deal: DealHealthRow): boolean {
  const activityDate = getActivityDate(deal);

  if (!activityDate) return true;

  return activityDate < staleCutoffForStatus(deal.status);
}

export async function GET(
  request: Request,
): Promise<NextResponse> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
  const supabase = getServiceClient();

    const recentCutoff = daysAgo(2);

    const [
      { data: activeDeals, error: activeDealsError },
      { count: recentlyUpdated, error: recentError },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("id,business_name,status,created_at,updated_at")
        .not("status", "in", "(won,lost)")
        .limit(500),

      supabase
        .from("deal_auto_progression_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", recentCutoff),
    ]);

    if (activeDealsError) throw new Error(activeDealsError.message);
    if (recentError) throw new Error(recentError.message);

    const deals = (activeDeals ?? []) as DealHealthRow[];
    const staleDeals = deals.filter(isDealStale);
    const totalDeals = deals.length;

    const staleRatio =
      totalDeals > 0 ? staleDeals.length / totalDeals : 0;

    const healthScore =
      totalDeals > 0 ? Math.max(0, Math.round((1 - staleRatio) * 100)) : 100;

    let healthStatus: "healthy" | "warning" | "critical" = "healthy";

    if (staleRatio >= 0.6 && staleDeals.length >= 5) {
      healthStatus = "critical";
    } else if (staleRatio >= 0.3 && staleDeals.length >= 3) {
      healthStatus = "warning";
    }

    return NextResponse.json({
      ok: true,
      signal: {
        totalDeals,
        recentlyUpdated: recentlyUpdated ?? 0,
        staleDeals: staleDeals.length,
        healthScore,
        healthStatus,
        staleList: staleDeals
          .sort((a, b) => {
            const aDate = getActivityDate(a) ?? "";
            const bDate = getActivityDate(b) ?? "";
            return aDate.localeCompare(bDate);
          })
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