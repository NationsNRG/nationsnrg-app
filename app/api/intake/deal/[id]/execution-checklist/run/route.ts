// app/api/intake/deal/[id]/execution-checklist/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  evaluateExecutionChecklist,
  type ExecutionChecklistInput,
} from "@/lib/deal-engine/execution-checklist";

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

    // ----------------------------
    // Corrected table queries
    // ----------------------------

    const [
      { data: readiness },
      { data: compensationTerms },
      { data: supplierSeq },
      { data: packageRow },
      { data: enforcementEvents },
      { data: docs },
    ] = await Promise.all([
      // ✅ CORRECT
      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

      // ✅ CORRECT (used to derive protection)
      supabase
        .from("compensation_terms")
        .select("*")
        .eq("deal_id", id),

      // ✅ CORRECT
      supabase
        .from("supplier_sequence_plans")
        .select("id")
        .eq("deal_id", id),

      // unchanged (your existing table)
      supabase
        .from("deal_packages")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

      // unchanged
      supabase
        .from("payout_enforcement_events")
        .select("*")
        .eq("deal_id", id)
        .in("enforcement_status", ["open", "in_progress"]),

      // ✅ CORRECT
      supabase
        .from("contract_required_documents")
        .select("*")
        .eq("deal_id", id),
    ]);

    // ----------------------------
    // Derived signals
    // ----------------------------

    const hasVerifiedUtilityBill =
      docs?.some(
        (d) => d.document_type === "utility_bill" && d.status === "verified",
      ) ?? false;

    const hasUsageHistory =
      docs?.some(
        (d) => d.document_type === "usage_history" && d.status === "verified",
      ) ?? false;

    const hasLoa =
      docs?.some(
        (d) => d.document_type === "loa" && d.status === "verified",
      ) ?? false;

    const hasAuthorizedSigner =
      docs?.some(
        (d) => d.document_type === "authority" && d.status === "verified",
      ) ?? false;

    // 🔑 derive compensation protection from terms
    const hasProtectedCompensation =
      compensationTerms?.some(
        (t) =>
          t.compensation_status === "protected" ||
          t.protection_level === "fully_protected" ||
          t.signed_acknowledgment_received === true,
      ) ?? false;

    const input: ExecutionChecklistInput = {
      dealId: id,
      executionLane: readiness?.execution_lane ?? "standard_supply",
      readinessScore: readiness?.readiness_score ?? null,
      compensationStatus: hasProtectedCompensation ? "protected" : "unprotected",
      supplierPackageStatus: packageRow?.package_status ?? null,
      blockerCount: readiness?.blocker_count ?? 0,

      hasVerifiedUtilityBill,
      hasVerifiedUsageHistory: hasUsageHistory,
      hasLoa,
      hasAuthorizedSigner,

      hasProtectedCompensation,
      hasSupplierSequence: (supplierSeq?.length ?? 0) > 0,
      hasSharedPackage: packageRow?.package_status === "shared",
      hasOpenPayoutEnforcement: (enforcementEvents?.length ?? 0) > 0,
    };

    const result = evaluateExecutionChecklist(input);

    // ----------------------------
    // Upsert checklist
    // ----------------------------

    const { data: checklist } = await supabase
      .from("execution_checklists")
      .upsert(
        {
          deal_id: id,
          checklist_type: "deal_execution",
          checklist_status: result.checklistStatus,
          execution_lane: input.executionLane,
          readiness_score_snapshot: input.readinessScore,
          compensation_status_snapshot: input.compensationStatus,
          package_status_snapshot: input.supplierPackageStatus,
          blocker_count_snapshot: input.blockerCount,
          checklist_summary: result.checklistSummary,
          next_required_action: result.nextRequiredAction,
          metadata: {
            gateStatus: result.gateStatus,
            gateScore: result.gateScore,
          },
        },
        { onConflict: "deal_id,checklist_type" },
      )
      .select("*")
      .single();

    if (!checklist) {
      throw new Error("Failed to upsert execution checklist");
    }

    // ----------------------------
    // Upsert checklist items
    // ----------------------------

    const itemRows = result.items.map((item) => ({
      checklist_id: checklist.id,
      deal_id: id,
      item_key: item.itemKey,
      item_title: item.itemTitle,
      item_description: item.itemDescription,
      item_status: item.itemStatus,
      item_category: item.itemCategory,
      severity: item.severity,
      required_before_stage: item.requiredBeforeStage,
      owner_type: item.ownerType,
    }));

    await supabase
      .from("execution_checklist_items")
      .upsert(itemRows, {
        onConflict: "checklist_id,item_key",
      });

    // ----------------------------
    // Insert gate event
    // ----------------------------

    await supabase.from("execution_gate_events").insert({
      deal_id: id,
      checklist_id: checklist.id,
      gate_type: "execution",
      gate_status: result.gateStatus,
      gate_score: result.gateScore,
      gate_reason: result.gateReason,
      recommended_action: result.recommendedAction,
      evaluated_by: "system",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      checklist,
      gate: {
        status: result.gateStatus,
        score: result.gateScore,
        reason: result.gateReason,
      },
      items: result.items.length,
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