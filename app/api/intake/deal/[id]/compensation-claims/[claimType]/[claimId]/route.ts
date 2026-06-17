// app/api/intake/deal/[id]/compensation-claims/[claimType]/[claimId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    claimType: string;
    claimId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_draft",
    "mark_claimable",
    "mark_submitted",
    "mark_approved",
    "mark_paid",
    "mark_disputed",
    "mark_rejected",
    "mark_waived",
  ]),
  notes: z.string().trim().nullable().optional(),
  invoiceReference: z.string().trim().nullable().optional(),
  payoutDueAt: z.string().trim().nullable().optional(),
});

const statusByAction = {
  mark_draft: "draft",
  mark_claimable: "claimable",
  mark_submitted: "submitted",
  mark_approved: "approved",
  mark_paid: "paid",
  mark_disputed: "disputed",
  mark_rejected: "rejected",
  mark_waived: "waived",
} as const;

function getTableName(claimType: string) {
  if (claimType === "commission") return "commission_claims";
  if (claimType === "referral") return "referral_fee_claims";
  if (claimType === "success") return "success_fee_claims";
  throw new Error("Invalid claim type.");
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, claimType, claimId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const tableName = getTableName(claimType);
    const nextStatus = statusByAction[body.action];
    const now = new Date().toISOString();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const updatePayload: Record<string, unknown> = {
      claim_status: nextStatus,
      notes: body.notes ?? undefined,
      metadata: {
        lastClaimAction: body.action,
        lastClaimActionAt: now,
        principle:
          "Claims should be paid only when earned, documented, and fair to all parties.",
      },
    };

    if (claimType === "commission") {
      updatePayload.invoice_reference = body.invoiceReference ?? undefined;
      updatePayload.payout_due_at = body.payoutDueAt ?? undefined;
      updatePayload.paid_at = nextStatus === "paid" ? now : undefined;
    }

    // fetch previous state first
    const { data: previous } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", claimId)
    .eq("deal_id", id)
    .maybeSingle();

    const { data, error } = await supabase
    .from(tableName)
    .update(updatePayload)
    .eq("id", claimId)
    .eq("deal_id", id)
    .select("*")
    .single();

    if (error || !data) {
    throw new Error(error?.message ?? "Failed to update compensation claim");
    }

    // insert audit record
    await supabase.from("compensation_claim_history").insert({
    deal_id: id,
    claim_type: claimType,
    claim_id: claimId,
    previous_status: previous?.claim_status ?? null,
    new_status: data.claim_status,
    action: body.action,
    invoice_reference:
        "invoice_reference" in data ? data.invoice_reference : null,
    payout_due_at: "payout_due_at" in data ? data.payout_due_at : null,
    paid_at: "paid_at" in data ? data.paid_at : null,
    notes: body.notes ?? null,
    metadata: {
        source: "claim_update_endpoint",
    },
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
      claimType,
      claim: data,
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