// app/api/intake/deal/[id]/operator-brief/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateOperatorBrief } from "@/lib/deal-engine/operator-brief";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function metadataString(metadata: unknown, key: string): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    key in metadata &&
    typeof (metadata as Record<string, unknown>)[key] === "string"
  ) {
    return (metadata as Record<string, unknown>)[key] as string;
  }

  return null;
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
      { data: deal, error: dealError },
      { data: readiness, error: readinessError },
      { data: compensationTerms, error: termsError },
      { data: retainedRights, error: rightsError },
      { data: payoutEvents, error: payoutError },
      { data: checklist, error: checklistError },
      { data: latestGate, error: gateError },
      { data: checklistItems, error: itemError },
      { data: supplierSequences, error: sequenceError },
      { data: contractGaps, error: gapError },
      { data: bigDeal, error: bigDealError },
      { data: rollup, error: rollupError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),

      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

      supabase.from("compensation_terms").select("*").eq("deal_id", id),

      supabase.from("retained_right_events").select("id").eq("deal_id", id),

      supabase
        .from("payout_enforcement_events")
        .select("id")
        .eq("deal_id", id)
        .in("enforcement_status", ["open", "in_progress"]),

      supabase
        .from("execution_checklists")
        .select("*")
        .eq("deal_id", id)
        .eq("checklist_type", "deal_execution")
        .maybeSingle(),

      supabase
        .from("execution_gate_events")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("execution_checklist_items")
        .select("id,severity,item_status")
        .eq("deal_id", id),

      supabase
        .from("supplier_sequence_plans")
        .select("id,metadata")
        .eq("deal_id", id),

      supabase
        .from("contract_gap_events")
        .select("id")
        .eq("deal_id", id)
        .in("gap_status", ["open", "in_progress"]),

      supabase
        .from("big_deal_desk_queue")
        .select("escalation_status")
        .eq("deal_id", id)
        .maybeSingle(),

      supabase
        .from("portfolio_rollup_queue")
        .select("hold_status")
        .eq("deal_id", id)
        .maybeSingle(),
    ]);

    if (dealError || !deal) throw new Error(dealError?.message ?? "Deal not found");
    if (readinessError) throw new Error(readinessError.message);
    if (termsError) throw new Error(termsError.message);
    if (rightsError) throw new Error(rightsError.message);
    if (payoutError) throw new Error(payoutError.message);
    if (checklistError) throw new Error(checklistError.message);
    if (gateError) throw new Error(gateError.message);
    if (itemError) throw new Error(itemError.message);
    if (sequenceError) throw new Error(sequenceError.message);
    if (gapError) throw new Error(gapError.message);
    if (bigDealError) throw new Error(bigDealError.message);
    if (rollupError) throw new Error(rollupError.message);

    const termRows = Array.isArray(compensationTerms) ? compensationTerms : [];

    const expectedCompensationTotal = termRows.reduce((sum, term) => {
      return sum + (typeof term.expected_value === "number" ? term.expected_value : 0);
    }, 0);

    const hasProtectedTerm = termRows.some(
      (term) =>
        term.compensation_status === "protected" ||
        term.protection_level === "fully_protected" ||
        term.signed_acknowledgment_received === true,
    );

    const disclosureSafe = termRows.some((term) => term.disclosure_allowed === true);

    const compensationScore = (() => {
      let score = 0;
      if (termRows.length > 0) score += 25;
      if (hasProtectedTerm) score += 35;
      if (disclosureSafe) score += 20;
      if (Array.isArray(retainedRights) && retainedRights.length > 0) score += 20;
      return Math.min(score, 100);
    })();

    const latestSupplierResponseType =
      Array.isArray(supplierSequences) && supplierSequences.length > 0
        ? supplierSequences
            .map((sequence) => metadataString(sequence.metadata, "latestResponseType"))
            .find((value): value is string => value !== null) ?? null
        : null;

    const openCriticalChecklistCount = Array.isArray(checklistItems)
      ? checklistItems.filter(
          (item) =>
            typeof item.severity === "number" &&
            item.severity >= 5 &&
            item.item_status !== "completed" &&
            item.item_status !== "waived",
        ).length
      : 0;

    const brief = generateOperatorBrief({
      dealId: id,
      businessName:
        typeof deal.business_name === "string" ? deal.business_name : null,
      state: typeof deal.state === "string" ? deal.state : null,
      estimatedMonthlyBill:
        typeof deal.estimated_monthly_bill === "number"
          ? deal.estimated_monthly_bill
          : null,
      dealStatus: typeof deal.status === "string" ? deal.status : null,

      readinessStatus:
        readiness && typeof readiness.readiness_status === "string"
          ? readiness.readiness_status
          : null,
      readinessScore:
        readiness && typeof readiness.readiness_score === "number"
          ? readiness.readiness_score
          : null,
      executionLane:
        readiness && typeof readiness.execution_lane === "string"
          ? readiness.execution_lane
          : null,
      nextReadinessAction:
        readiness && typeof readiness.next_required_action === "string"
          ? readiness.next_required_action
          : null,

      compensationStatus: hasProtectedTerm ? "protected" : "unprotected",
      compensationScore,
      disclosureSafe,
      expectedCompensationTotal,
      retainedRightsCount: Array.isArray(retainedRights)
        ? retainedRights.length
        : 0,
      openPayoutEnforcementCount: Array.isArray(payoutEvents)
        ? payoutEvents.length
        : 0,

      checklistStatus:
        checklist && typeof checklist.checklist_status === "string"
          ? checklist.checklist_status
          : null,
      latestGateStatus:
        latestGate && typeof latestGate.gate_status === "string"
          ? latestGate.gate_status
          : null,
      latestGateScore:
        latestGate && typeof latestGate.gate_score === "number"
          ? latestGate.gate_score
          : null,
      latestGateAction:
        latestGate && typeof latestGate.recommended_action === "string"
          ? latestGate.recommended_action
          : null,

      supplierSequenceCount: Array.isArray(supplierSequences)
        ? supplierSequences.length
        : 0,
      latestSupplierResponseType,

      openContractGapCount: Array.isArray(contractGaps) ? contractGaps.length : 0,
      openCriticalChecklistCount,
      bigDealStatus:
        bigDeal && typeof bigDeal.escalation_status === "string"
          ? bigDeal.escalation_status
          : null,
      rollupStatus:
        rollup && typeof rollup.hold_status === "string"
          ? rollup.hold_status
          : null,
    });

    const { data: savedBrief, error: upsertError } = await supabase
      .from("operator_briefs")
      .upsert(
        {
          deal_id: id,
          brief_type: "deal_operator_brief",
          brief_status: "draft",
          brief_title: brief.briefTitle,
          executive_summary: brief.executiveSummary,
          current_posture: brief.currentPosture,
          money_path_summary: brief.moneyPathSummary,
          risk_summary: brief.riskSummary,
          next_best_action: brief.nextBestAction,
          operator_workload_level: brief.operatorWorkloadLevel,
          delegation_recommendation: brief.delegationRecommendation,
          disclosure_recommendation: brief.disclosureRecommendation,
          compensation_recommendation: brief.compensationRecommendation,
          epc_recommendation: brief.epcRecommendation,
          metadata: {
            generatedBy: "operator_brief_engine",
            compensationScore,
            disclosureSafe,
            expectedCompensationTotal,
            openCriticalChecklistCount,
          },
        },
        { onConflict: "deal_id,brief_type" },
      )
      .select("*")
      .single();

    if (upsertError || !savedBrief) {
      throw new Error(upsertError?.message ?? "Failed to save operator brief");
    }

    await supabase.from("operator_brief_events").insert({
      deal_id: id,
      operator_brief_id: savedBrief.id,
      event_type: "brief_generated",
      event_status: "logged",
      event_title: "Operator brief generated",
      event_summary: brief.nextBestAction,
      triggered_by: "operator",
      metadata: {
        workloadLevel: brief.operatorWorkloadLevel,
        disclosureSafe,
        compensationScore,
      },
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      operatorBrief: savedBrief,
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