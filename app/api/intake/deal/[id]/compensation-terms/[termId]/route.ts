// app/api/intake/deal/[id]/compensation-terms/[termId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    termId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_drafted",
    "mark_review_required",
    "mark_protected",
    "mark_waived",
    "mark_rejected",
    "require_ack",
    "mark_ack_received",
    "allow_disclosure",
    "block_disclosure",
  ]),
  notes: z.string().trim().nullable().optional(),
});

function mapActionToUpdate(action: z.infer<typeof patchSchema>["action"]) {
  if (action === "mark_drafted") {
    return {
      compensation_status: "drafted",
      protection_level: "drafted",
    };
  }

  if (action === "mark_review_required") {
    return {
      compensation_status: "review_required",
      protection_level: "counterparty_ack_required",
    };
  }

  if (action === "mark_protected") {
    return {
      compensation_status: "protected",
      protection_level: "fully_protected",
      signed_acknowledgment_required: true,
      signed_acknowledgment_received: true,
      disclosure_allowed: true,
    };
  }

  if (action === "mark_waived") {
    return {
      compensation_status: "waived",
      disclosure_allowed: false,
    };
  }

  if (action === "mark_rejected") {
    return {
      compensation_status: "rejected",
      disclosure_allowed: false,
    };
  }

  if (action === "require_ack") {
    return {
      signed_acknowledgment_required: true,
      protection_level: "counterparty_ack_required",
      disclosure_allowed: false,
    };
  }

  if (action === "mark_ack_received") {
    return {
      signed_acknowledgment_received: true,
      protection_level: "counterparty_ack_received",
    };
  }

  if (action === "allow_disclosure") {
    return {
      disclosure_allowed: true,
    };
  }

  return {
    disclosure_allowed: false,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, termId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const updatePayload = {
      ...mapActionToUpdate(body.action),
      notes: body.notes ?? undefined,
      metadata: {
        lastCompensationAction: body.action,
        lastCompensationActionAt: new Date().toISOString(),
        principle:
          "Protect NationsNRG while keeping terms reasonable, attractive, and partner-friendly.",
      },
    };

    const { data, error } = await supabase
      .from("compensation_terms")
      .update(updatePayload)
      .eq("id", termId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update compensation term");
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/intake/deal/${id}/compensation-protection`,
      {
        method: "POST",
        cache: "no-store",
      },
    );

    return NextResponse.json({
      ok: true,
      dealId: id,
      term: data,
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