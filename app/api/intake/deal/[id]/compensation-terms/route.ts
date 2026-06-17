// app/api/intake/deal/[id]/compensation-terms/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  compensationType: z.enum([
    "broker_commission",
    "referral_fee",
    "success_fee",
    "packaging_fee",
    "advisory_fee",
    "retained_upside",
    "future_expansion_rights",
    "other",
  ]),
  compensationStatus: z
    .enum(["drafted", "review_required", "protected", "waived", "rejected"])
    .default("drafted"),
  payorType: z.enum(["supplier", "epc", "buyer", "partner", "marketplace", "other"]),
  payorIdentifier: z.string().trim().nullable().optional(),
  paymentTrigger: z.enum([
    "contract_signed",
    "enrollment_accepted",
    "project_funded",
    "project_completed",
    "supplier_paid",
    "buyer_paid",
    "milestone",
    "other",
  ]),
  paymentBasis: z.enum([
    "per_kwh",
    "per_therm",
    "percentage_of_savings",
    "percentage_of_contract_value",
    "flat_fee",
    "success_fee",
    "spread_margin",
    "other",
  ]),
  expectedValue: z.number().finite().min(0).nullable().optional(),
  termSummary: z.string().trim().min(1),
  protectionLevel: z
    .enum([
      "internal_only",
      "drafted",
      "counterparty_ack_required",
      "counterparty_ack_received",
      "fully_protected",
    ])
    .default("drafted"),
  signedAcknowledgmentRequired: z.boolean().default(true),
  signedAcknowledgmentReceived: z.boolean().default(false),
  disclosureAllowed: z.boolean().default(false),
  notes: z.string().trim().nullable().optional(),
});

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

    const { data, error } = await supabase
      .from("compensation_terms")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      terms: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = createSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("compensation_terms")
      .insert({
        deal_id: id,
        compensation_type: body.compensationType,
        compensation_status: body.compensationStatus,
        payor_type: body.payorType,
        payor_identifier: body.payorIdentifier ?? null,
        beneficiary_type: "nationsnrg",
        payment_trigger: body.paymentTrigger,
        payment_basis: body.paymentBasis,
        expected_value: body.expectedValue ?? null,
        currency: "USD",
        term_summary: body.termSummary,
        protection_level: body.protectionLevel,
        signed_acknowledgment_required: body.signedAcknowledgmentRequired,
        signed_acknowledgment_received: body.signedAcknowledgmentReceived,
        disclosure_allowed: body.disclosureAllowed,
        notes: body.notes ?? null,
        metadata: {
          strategy: "360_opportunity_capture",
          fairnessPrinciple:
            "Reasonable, attractive, partner-friendly economics while protecting NationsNRG from every valid monetization angle.",
          mutualProtection:
            "Terms should protect NationsNRG, counterparties, and partner trust.",
        },
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create compensation term");
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      term: data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}