// app/api/intake/deal/[id]/compensation-claims/seed/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

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

    const { data: terms, error: termsError } = await supabase
      .from("compensation_terms")
      .select("*")
      .eq("deal_id", id);

    if (termsError) throw new Error(termsError.message);

    const termRows = Array.isArray(terms) ? terms : [];

    const commissionRows = termRows
      .filter((term) => term.compensation_type === "broker_commission")
      .map((term) => ({
        deal_id: id,
        compensation_term_id: term.id,
        claim_status: "draft",
        claim_amount: term.expected_value ?? null,
        claim_currency: "USD",
        claim_basis: term.payment_basis,
        claim_trigger_event: term.payment_trigger,
        counterparty_identifier: term.payor_identifier ?? null,
        notes:
          "Seeded from broker commission compensation term. Review before submission.",
        metadata: {
          seededBy: "compensation_claim_seed",
          compensationType: term.compensation_type,
        },
      }));

    const referralRows = termRows
      .filter((term) => term.compensation_type === "referral_fee")
      .map((term) => ({
        deal_id: id,
        compensation_term_id: term.id,
        referral_party: "nationsnrg",
        referred_counterparty: term.payor_identifier ?? null,
        claim_status: "draft",
        expected_fee: term.expected_value ?? null,
        fee_currency: "USD",
        payment_trigger: term.payment_trigger,
        acknowledgment_status: term.signed_acknowledgment_received
          ? "received"
          : term.signed_acknowledgment_required
            ? "requested"
            : "missing",
        notes:
          "Seeded from referral fee compensation term. Confirm acknowledgment and payment trigger.",
        metadata: {
          seededBy: "compensation_claim_seed",
          compensationType: term.compensation_type,
        },
      }));

    const successRows = termRows
      .filter((term) => term.compensation_type === "success_fee")
      .map((term) => ({
        deal_id: id,
        compensation_term_id: term.id,
        success_event: "deal_closed",
        claim_status: "draft",
        expected_success_fee: term.expected_value ?? null,
        fee_currency: "USD",
        success_fee_basis: term.payment_basis,
        counterparty_identifier: term.payor_identifier ?? null,
        notes:
          "Seeded from success fee compensation term. Confirm success event before claim submission.",
        metadata: {
          seededBy: "compensation_claim_seed",
          compensationType: term.compensation_type,
        },
      }));

    const results: Record<string, unknown> = {
      commissionClaims: [],
      referralClaims: [],
      successClaims: [],
    };

    if (commissionRows.length > 0) {
      const { data, error } = await supabase
        .from("commission_claims")
        .insert(commissionRows)
        .select("*");

      if (error) throw new Error(error.message);
      results.commissionClaims = data ?? [];
    }

    if (referralRows.length > 0) {
      const { data, error } = await supabase
        .from("referral_fee_claims")
        .insert(referralRows)
        .select("*");

      if (error) throw new Error(error.message);
      results.referralClaims = data ?? [];
    }

    if (successRows.length > 0) {
      const { data, error } = await supabase
        .from("success_fee_claims")
        .insert(successRows)
        .select("*");

      if (error) throw new Error(error.message);
      results.successClaims = data ?? [];
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/api/intake/deal/${id}/compensation-protection`,
      {
        method: "POST",
        cache: "no-store",
      },
    );

    return NextResponse.json({
      ok: true,
      dealId: id,
      seeded: {
        commission: commissionRows.length,
        referral: referralRows.length,
        success: successRows.length,
      },
      results,
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