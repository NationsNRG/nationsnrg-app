// app/api/intake/deal/[id]/review-actions/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [
      { data: deal, error: dealError },
      { data: demandEstimate, error: demandError },
      { data: economicStack, error: economicError },
      { data: blockers, error: blockersError },
      { data: supplierSequences, error: supplierSequencesError },
      { data: nextBestActions, error: nbaError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),
      supabase
        .from("deal_demand_estimates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("deal_economic_stack_decisions")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),
      supabase
        .from("deal_blocker_states")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_sequence_plans")
        .select("*")
        .eq("deal_id", id)
        .order("sequence_position", { ascending: true }),
      supabase
        .from("deal_next_best_actions")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }
    if (demandError) throw new Error(demandError.message);
    if (economicError) throw new Error(economicError.message);
    if (blockersError) throw new Error(blockersError.message);
    if (supplierSequencesError) throw new Error(supplierSequencesError.message);
    if (nbaError) throw new Error(nbaError.message);

    const actions: Array<{
      key: string;
      title: string;
      priority: "high" | "medium" | "low";
      reason: string;
    }> = [];

    if ((blockers ?? []).length > 0) {
      actions.push({
        key: "resolve_blockers",
        title: "Resolve blocker state",
        priority: "high",
        reason: "Deal has active blockers that prevent clean progression.",
      });
    }

    if (!demandEstimate) {
      actions.push({
        key: "generate_demand_estimate",
        title: "Generate demand estimate",
        priority: "high",
        reason: "No demand estimate is currently stored for this deal.",
      });
    }

    if ((supplierSequences ?? []).length === 0) {
      actions.push({
        key: "attach_supplier",
        title: "Attach ranked supplier",
        priority: "high",
        reason: "No supplier sequence exists yet for this deal.",
      });
    }

    if (economicStack?.stack_type === "premium_escalation") {
      actions.push({
        key: "review_premium_path",
        title: "Review premium escalation posture",
        priority: "high",
        reason: "Deal is on premium escalation path and needs controlled review.",
      });
    }

    if (
      demandEstimate &&
      typeof demandEstimate.load_band === "string" &&
      demandEstimate.load_band === "infrastructure_candidate"
    ) {
      actions.push({
        key: "review_infrastructure_fit",
        title: "Review infrastructure fit",
        priority: "medium",
        reason: "Demand profile indicates possible infrastructure-grade opportunity.",
      });
    }

    if ((nextBestActions ?? []).length > 0) {
      const latest = nextBestActions?.[0];
      if (latest && typeof latest.action_title === "string") {
        actions.push({
          key: "follow_next_best_action",
          title: latest.action_title,
          priority: "medium",
          reason: "System-generated next best action is available.",
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        reviewActions: actions,
      },
      { status: 200 },
    );
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