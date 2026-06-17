// app/api/intake/deal/[id]/payout-enforcement/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluatePayoutEnforcement } from "@/lib/deal-engine/payout-enforcement";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type ClaimType = "commission" | "referral" | "success";

interface ClaimCandidate {
  claimType: ClaimType;
  claimId: string;
  claimStatus: string;
  expectedAmount: number | null;
  payoutDueAt: string | null;
  paidAt: string | null;
  counterpartyIdentifier: string | null;
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
      { data: commissionClaims, error: commissionError },
      { data: referralClaims, error: referralError },
      { data: successClaims, error: successError },
    ] = await Promise.all([
      supabase.from("commission_claims").select("*").eq("deal_id", id),
      supabase.from("referral_fee_claims").select("*").eq("deal_id", id),
      supabase.from("success_fee_claims").select("*").eq("deal_id", id),
    ]);

    if (commissionError) throw new Error(commissionError.message);
    if (referralError) throw new Error(referralError.message);
    if (successError) throw new Error(successError.message);

    const candidates: ClaimCandidate[] = [
      ...(commissionClaims ?? []).map((claim) => ({
        claimType: "commission" as const,
        claimId: String(claim.id),
        claimStatus: String(claim.claim_status),
        expectedAmount:
          typeof claim.claim_amount === "number" ? claim.claim_amount : null,
        payoutDueAt:
          typeof claim.payout_due_at === "string" ? claim.payout_due_at : null,
        paidAt: typeof claim.paid_at === "string" ? claim.paid_at : null,
        counterpartyIdentifier:
          typeof claim.counterparty_identifier === "string"
            ? claim.counterparty_identifier
            : null,
      })),
      ...(referralClaims ?? []).map((claim) => ({
        claimType: "referral" as const,
        claimId: String(claim.id),
        claimStatus: String(claim.claim_status),
        expectedAmount:
          typeof claim.expected_fee === "number" ? claim.expected_fee : null,
        payoutDueAt: null,
        paidAt: null,
        counterpartyIdentifier:
          typeof claim.referred_counterparty === "string"
            ? claim.referred_counterparty
            : null,
      })),
      ...(successClaims ?? []).map((claim) => ({
        claimType: "success" as const,
        claimId: String(claim.id),
        claimStatus: String(claim.claim_status),
        expectedAmount:
          typeof claim.expected_success_fee === "number"
            ? claim.expected_success_fee
            : null,
        payoutDueAt: null,
        paidAt: null,
        counterpartyIdentifier:
          typeof claim.counterparty_identifier === "string"
            ? claim.counterparty_identifier
            : null,
      })),
    ];

    const insertedEvents = [];

    for (const candidate of candidates) {
      const decision = evaluatePayoutEnforcement(candidate);

      if (!decision.shouldEscalate) {
        continue;
      }

      const { data: existingOpen, error: existingError } = await supabase
        .from("payout_enforcement_events")
        .select("id")
        .eq("deal_id", id)
        .eq("claim_type", candidate.claimType)
        .eq("claim_id", candidate.claimId)
        .in("enforcement_status", ["open", "in_progress"])
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      if (existingOpen) {
        continue;
      }

      const { data: event, error: insertError } = await supabase
        .from("payout_enforcement_events")
        .insert({
          deal_id: id,
          claim_type: candidate.claimType,
          claim_id: candidate.claimId,
          enforcement_status: "open",
          enforcement_severity: decision.enforcementSeverity,
          enforcement_reason: decision.enforcementReason,
          recommended_action: decision.recommendedAction,
          escalation_owner: "operator",
          metadata: {
            expectedAmount: candidate.expectedAmount,
            counterpartyIdentifier: candidate.counterpartyIdentifier,
            claimStatus: candidate.claimStatus,
          },
        })
        .select("*")
        .single();

      if (insertError || !event) {
        throw new Error(
          insertError?.message ?? "Failed to create enforcement event",
        );
      }

      insertedEvents.push(event);
    }

    return NextResponse.json({
      ok: true,
      dealId: id,
      scanned: candidates.length,
      created: insertedEvents.length,
      enforcementEvents: insertedEvents,
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