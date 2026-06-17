// app/api/intake/deal/[id]/autonomous-decision/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateAutonomousDecisions } from "@/lib/deal-engine/autonomous-decision";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
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
      { data: deal },
      { data: demand },
      { data: readiness },
      { data: compensationTerms },
      { data: packages },
      { data: supplierSeq },
      { data: epcScores },
      { data: epcSeq },
      { data: gaps },
      { data: checklistItems },
      { data: payoutEvents },
      { data: latestGate },
      { data: operatorBrief },
    ] = await Promise.all([
      supabase.from("deals").select("id,status").eq("id", id).single(),

      supabase
        .from("deal_demand_estimates")
        .select("id")
        .eq("deal_id", id)
        .limit(1),

      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

      supabase.from("compensation_terms").select("*").eq("deal_id", id),

      supabase.from("deal_packages").select("id").eq("deal_id", id).limit(1),

      supabase
        .from("supplier_sequence_plans")
        .select("id")
        .eq("deal_id", id),

      supabase
        .from("epc_deal_fit_scores")
        .select("id")
        .eq("deal_id", id)
        .limit(1),

      supabase
        .from("epc_sequence_plans")
        .select("id")
        .eq("deal_id", id),

      supabase
        .from("contract_gap_events")
        .select("id")
        .eq("deal_id", id)
        .in("gap_status", ["open", "in_progress"]),

      supabase
        .from("execution_checklist_items")
        .select("id,severity,item_status")
        .eq("deal_id", id),

      supabase
        .from("payout_enforcement_events")
        .select("id")
        .eq("deal_id", id)
        .in("enforcement_status", ["open", "in_progress"]),

      supabase
        .from("execution_gate_events")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("operator_briefs")
        .select("updated_at")
        .eq("deal_id", id)
        .eq("brief_type", "deal_operator_brief")
        .maybeSingle(),
    ]);

    if (!deal) {
      throw new Error("Deal not found.");
    }

    const termRows = Array.isArray(compensationTerms) ? compensationTerms : [];

    const hasProtectedTerm = termRows.some(
      (term) =>
        term.compensation_status === "protected" ||
        term.protection_level === "fully_protected" ||
        term.signed_acknowledgment_received === true,
    );

    const disclosureSafe = termRows.some(
      (term) => term.disclosure_allowed === true,
    );

    const openCriticalChecklistCount = Array.isArray(checklistItems)
      ? checklistItems.filter(
          (item) =>
            typeof item.severity === "number" &&
            item.severity >= 5 &&
            item.item_status !== "completed" &&
            item.item_status !== "waived",
        ).length
      : 0;

    const result = evaluateAutonomousDecisions({
      dealId: id,
      dealStatus: typeof deal.status === "string" ? deal.status : null,
      readinessStatus:
        readiness && typeof readiness.readiness_status === "string"
          ? readiness.readiness_status
          : null,
      readinessScore:
        readiness && typeof readiness.readiness_score === "number"
          ? readiness.readiness_score
          : null,
      compensationStatus: hasProtectedTerm ? "protected" : "unprotected",
      disclosureSafe,
      executionGateStatus:
        latestGate && typeof latestGate.gate_status === "string"
          ? latestGate.gate_status
          : null,
      executionGateScore:
        latestGate && typeof latestGate.gate_score === "number"
          ? latestGate.gate_score
          : null,
      supplierSequenceCount: Array.isArray(supplierSeq) ? supplierSeq.length : 0,
      epcSequenceCount: Array.isArray(epcSeq) ? epcSeq.length : 0,
      openContractGapCount: Array.isArray(gaps) ? gaps.length : 0,
      openCriticalChecklistCount,
      openPayoutEnforcementCount: Array.isArray(payoutEvents)
        ? payoutEvents.length
        : 0,
      hasDemandEstimate: Array.isArray(demand) && demand.length > 0,
      hasPackage: Array.isArray(packages) && packages.length > 0,
      hasSupplierSequence: Array.isArray(supplierSeq) && supplierSeq.length > 0,
      hasEpcScores: Array.isArray(epcScores) && epcScores.length > 0,
      lastOperatorBriefAt:
        operatorBrief && typeof operatorBrief.updated_at === "string"
          ? operatorBrief.updated_at
          : null,
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      result,
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