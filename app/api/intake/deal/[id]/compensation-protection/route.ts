// app/api/intake/deal/[id]/compensation-protection/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateCompensationProtection } from "@/lib/deal-engine/compensation-protection";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{ id: string }>;
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
      { data: terms, error: termsError },
      { data: commissionClaims, error: commissionError },
      { data: referralClaims, error: referralError },
      { data: successClaims, error: successError },
      { data: rights, error: rightsError },
      { data: readiness, error: readinessError },
    ] = await Promise.all([
      supabase.from("compensation_terms").select("*").eq("deal_id", id),
      supabase.from("commission_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("referral_fee_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("success_fee_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("retained_right_events").select("*").eq("deal_id", id),
      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),
    ]);

    if (termsError) throw new Error(termsError.message);
    if (commissionError) throw new Error(commissionError.message);
    if (referralError) throw new Error(referralError.message);
    if (successError) throw new Error(successError.message);
    if (rightsError) throw new Error(rightsError.message);
    if (readinessError) throw new Error(readinessError.message);

    const termRows = Array.isArray(terms) ? terms : [];

    const result = evaluateCompensationProtection({
      dealId: id,
      hasCompensationTerms: termRows.length > 0,
      hasProtectedTerm: termRows.some(
        (term) =>
          term.compensation_status === "protected" ||
          term.protection_level === "fully_protected" ||
          term.protection_level === "counterparty_ack_received",
      ),
      hasSignedAcknowledgment: termRows.some(
        (term) => term.signed_acknowledgment_received === true,
      ),
      hasClaimRecord:
        (Array.isArray(commissionClaims) && commissionClaims.length > 0) ||
        (Array.isArray(referralClaims) && referralClaims.length > 0) ||
        (Array.isArray(successClaims) && successClaims.length > 0),
      hasRetainedRights: Array.isArray(rights) && rights.length > 0,
      disclosureAllowed: termRows.some((term) => term.disclosure_allowed === true),
      readinessScore:
        readiness && typeof readiness.readiness_score === "number"
          ? readiness.readiness_score
          : null,
      executionLane:
        readiness && typeof readiness.execution_lane === "string"
          ? readiness.execution_lane
          : null,
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      compensationProtection: result,
      terms: termRows,
      retainedRights: rights ?? [],
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

    const { data: readiness, error: readinessError } = await supabase
      .from("contract_readiness_profiles")
      .select("*")
      .eq("deal_id", id)
      .maybeSingle();

    if (readinessError) throw new Error(readinessError.message);

    const [
      { data: terms, error: termsError },
      { data: commissionClaims, error: commissionError },
      { data: referralClaims, error: referralError },
      { data: successClaims, error: successError },
      { data: rights, error: rightsError },
    ] = await Promise.all([
      supabase.from("compensation_terms").select("*").eq("deal_id", id),
      supabase.from("commission_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("referral_fee_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("success_fee_claims").select("id").eq("deal_id", id).limit(1),
      supabase.from("retained_right_events").select("*").eq("deal_id", id),
    ]);

    if (termsError) throw new Error(termsError.message);
    if (commissionError) throw new Error(commissionError.message);
    if (referralError) throw new Error(referralError.message);
    if (successError) throw new Error(successError.message);
    if (rightsError) throw new Error(rightsError.message);

    const termRows = Array.isArray(terms) ? terms : [];

    const result = evaluateCompensationProtection({
      dealId: id,
      hasCompensationTerms: termRows.length > 0,
      hasProtectedTerm: termRows.some(
        (term) =>
          term.compensation_status === "protected" ||
          term.protection_level === "fully_protected" ||
          term.protection_level === "counterparty_ack_received",
      ),
      hasSignedAcknowledgment: termRows.some(
        (term) => term.signed_acknowledgment_received === true,
      ),
      hasClaimRecord:
        (Array.isArray(commissionClaims) && commissionClaims.length > 0) ||
        (Array.isArray(referralClaims) && referralClaims.length > 0) ||
        (Array.isArray(successClaims) && successClaims.length > 0),
      hasRetainedRights: Array.isArray(rights) && rights.length > 0,
      disclosureAllowed: termRows.some((term) => term.disclosure_allowed === true),
      readinessScore:
        readiness && typeof readiness.readiness_score === "number"
          ? readiness.readiness_score
          : null,
      executionLane:
        readiness && typeof readiness.execution_lane === "string"
          ? readiness.execution_lane
          : null,
    });

    await supabase
      .from("contract_readiness_profiles")
      .update({
        compensation_protection_status: result.compensationProtectionStatus,
        metadata: {
          compensationProtectionScore: result.protectionScore,
          compensationDisclosureSafe: result.disclosureSafe,
          compensationNextRequiredAction: result.nextRequiredAction,
        },
      })
      .eq("deal_id", id);

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      compensationProtection: result,
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