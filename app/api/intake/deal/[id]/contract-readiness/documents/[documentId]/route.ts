// app/api/intake/deal/[id]/contract-readiness/documents/[documentId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
}

const patchSchema = z.object({
  requirementStatus: z.enum([
    "missing",
    "requested",
    "received",
    "verified",
    "waived",
    "rejected",
  ]),
  notes: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, documentId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("contract_required_documents")
      .update({
        requirement_status: body.requirementStatus,
        notes: body.notes ?? null,
        received_at:
          body.requirementStatus === "received" ||
          body.requirementStatus === "verified"
            ? now
            : null,
        verified_at: body.requirementStatus === "verified" ? now : null,
        metadata: {
          lastUpdatedBy: "operator",
          lastUpdatedAt: now,
        },
      })
      .eq("id", documentId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update document status");
    }

    if (
      body.requirementStatus === "verified" ||
      body.requirementStatus === "waived"
    ) {
      await supabase
        .from("contract_gap_events")
        .update({
          gap_status: "resolved",
          resolved_at: now,
          resolution_action: `Document ${body.requirementStatus}.`,
        })
        .eq("deal_id", id)
        .eq("metadata->>documentType", data.document_type)
        .in("gap_status", ["open", "in_progress"]);
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "document_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      document: data,
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