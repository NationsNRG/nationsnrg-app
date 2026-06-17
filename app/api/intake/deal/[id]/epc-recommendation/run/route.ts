// app/api/intake/deal/[id]/epc-recommendation/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateEpcRecommendation } from "@/lib/deal-engine/epc-recommendation";

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

    // -----------------------------
    // Fetch deal + signals
    // -----------------------------
    const [
      { data: deal, error: dealError },
      { data: readiness },
      { data: checklist },
      { data: gate },
      { data: compensationTerms },
      { data: retainedRights },
      { data: docs },
      { data: epcs, error: epcError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),

      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

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

      supabase.from("compensation_terms").select("*").eq("deal_id", id),

      supabase.from("retained_right_events").select("id").eq("deal_id", id),

      supabase
        .from("contract_required_documents")
        .select("*")
        .eq("deal_id", id),

      supabase
        .from("epc_partner_profiles")
        .select("*")
        .eq("epc_status", "active"),
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }

    if (epcError) {
      throw new Error(epcError.message);
    }

    // -----------------------------
    // Derive signals
    // -----------------------------

    const annualSpend =
      typeof deal.estimated_annual_spend === "number"
        ? deal.estimated_annual_spend
        : typeof deal.estimated_monthly_bill === "number"
          ? deal.estimated_monthly_bill * 12
          : null;

    const hasProtectedTerm =
      compensationTerms?.some(
        (t) =>
          t.compensation_status === "protected" ||
          t.protection_level === "fully_protected" ||
          t.signed_acknowledgment_received === true,
      ) ?? false;

    const disclosureSafe =
      compensationTerms?.some((t) => t.disclosure_allowed === true) ?? false;

    const siteDataStatus =
    docs?.some((d) => d.requirement_status === "verified")
        ? "verified"
        : docs?.length
          ? "partial"
          : "missing";

    const hasLiabilityBoundary =
      (retainedRights?.length ?? 0) > 0;

    const hasAccountManagementOwner =
      checklist?.metadata?.accountOwnerAssigned === true;

    // -----------------------------
    // Score EPCs
    // -----------------------------

    const results: any[] = [];

    for (const epc of epcs ?? []) {
      const result = evaluateEpcRecommendation({
        epc: {
          epcProfileId: epc.id,
          epcIdentifier: epc.epc_identifier,
          epcName: epc.epc_name,
          coverageStates: epc.coverage_states ?? [],
          preferredMarkets: epc.preferred_markets ?? [],
          preferredProjectTypes: epc.preferred_project_types ?? [],
          preferredIndustries: epc.preferred_industries ?? [],
          minimumProjectValue: epc.minimum_project_value,
          maximumProjectValue: epc.maximum_project_value,
          minimumMonthlyEnergyBill: epc.minimum_monthly_energy_bill,
          financingAppetite: epc.financing_appetite,
          speedToResponseScore: epc.speed_to_response_score,
          relationshipStrengthScore: epc.relationship_strength_score,
          disclosureTolerance: epc.disclosure_tolerance,
          compensationRequirement: epc.compensation_requirement,
          liabilityBoundaryRequirement: epc.liability_boundary_requirement,
          accountManagementRequired: epc.account_management_required,
        },
        deal: {
          dealId: id,
          state: deal.state ?? null,
          industry: deal.industry ?? null,
          estimatedMonthlyBill: deal.estimated_monthly_bill ?? null,
          estimatedAnnualSpend: annualSpend,
          readinessScore: readiness?.readiness_score ?? null,
          buyerIdentityStatus: readiness?.buyer_identity_status ?? null,
          siteDataStatus,
          compensationProtectionStatus: hasProtectedTerm
            ? "protected"
            : "unprotected",
          disclosureSafe,
          executionGateScore: gate?.gate_score ?? null,
          hasLiabilityBoundary,
          hasAccountManagementOwner,
          executionLane: readiness?.execution_lane ?? null,
        },
      });

      results.push({
        epcProfileId: epc.id,
        epcIdentifier: epc.epc_identifier,
        result,
      });
    }

    // -----------------------------
    // Rank EPCs
    // -----------------------------

    const ranked = results
      .sort((a, b) => b.result.fitScore - a.result.fitScore)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    // -----------------------------
    // Persist scores
    // -----------------------------

    for (const entry of ranked) {
      await supabase.from("epc_deal_fit_scores").upsert(
        {
          deal_id: id,
          epc_profile_id: entry.epcProfileId,
          epc_identifier: entry.epcIdentifier,
          fit_score: entry.result.fitScore,
          recommendation_status: entry.result.recommendationStatus,
          recommendation_rank: entry.rank,
          geography_score: entry.result.geographyScore,
          project_size_score: entry.result.projectSizeScore,
          load_profile_score: entry.result.loadProfileScore,
          industry_score: entry.result.industryScore,
          buyer_readiness_score: entry.result.buyerReadinessScore,
          site_readiness_score: entry.result.siteReadinessScore,
          compensation_protection_score:
            entry.result.compensationProtectionScore,
          disclosure_safety_score: entry.result.disclosureSafetyScore,
          execution_gate_score: entry.result.executionGateScore,
          response_likelihood_score: entry.result.responseLikelihoodScore,
          relationship_score: entry.result.relationshipScore,
          liability_boundary_score: entry.result.liabilityBoundaryScore,
          fit_reason: entry.result.fitReason,
          recommended_package_level:
            entry.result.recommendedPackageLevel,
          recommended_next_action:
            entry.result.recommendedNextAction,
        },
        {
          onConflict: "deal_id,epc_profile_id",
        },
      );
    }

    // -----------------------------
    // Primary + backup selection
    // -----------------------------

    const primary = ranked[0] ?? null;
    const backup = ranked[1] ?? null;

    if (primary) {
      await supabase.from("epc_recommendation_events").insert({
        deal_id: id,
        epc_profile_id: primary.epcProfileId,
        epc_identifier: primary.epcIdentifier,
        event_type: "epc_primary_selected",
        event_title: "Primary EPC selected",
        event_summary: primary.result.recommendedNextAction,
        fit_score_snapshot: primary.result.fitScore,
        recommended_package_level:
          primary.result.recommendedPackageLevel,
      });
    }

    if (backup) {
      await supabase.from("epc_recommendation_events").insert({
        deal_id: id,
        epc_profile_id: backup.epcProfileId,
        epc_identifier: backup.epcIdentifier,
        event_type: "epc_backup_selected",
        event_title: "Backup EPC selected",
        event_summary: backup.result.recommendedNextAction,
        fit_score_snapshot: backup.result.fitScore,
        recommended_package_level:
          backup.result.recommendedPackageLevel,
      });
    }

    return NextResponse.json({
      ok: true,
      dealId: id,
      totalEpcs: ranked.length,
      primary,
      backup,
      topResults: ranked.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}