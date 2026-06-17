// app/api/intake/deal/[id]/documents/uploads/[uploadId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    uploadId: string;
  }>;
}

const patchSchema = z.object({
  uploadStatus: z
    .enum(["metadata_only", "uploaded", "failed", "archived"])
    .optional(),
  verificationStatus: z
    .enum(["pending", "in_review", "verified", "rejected", "waived"])
    .optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, uploadId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      notes: body.notes ?? null,
      metadata: {
        lastUpdatedBy: "operator",
        lastUpdatedAt: now,
      },
    };

    if (body.uploadStatus !== undefined) {
      updatePayload.upload_status = body.uploadStatus;
    }

    if (body.verificationStatus !== undefined) {
      updatePayload.verification_status = body.verificationStatus;
      updatePayload.verified_at =
        body.verificationStatus === "verified" ? now : null;
    }

    const { data: existingUpload, error: existingError } = await supabase
      .from("document_upload_records")
      .select("*")
      .eq("id", uploadId)
      .eq("deal_id", id)
      .single();

    if (existingError || !existingUpload) {
     throw new Error(existingError?.message ?? "Upload record not found");
    }

    const { data: upload, error } = await supabase
      .from("document_upload_records")
      .update(updatePayload)
      .eq("id", uploadId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !upload) {
      throw new Error(error?.message ?? "Failed to update upload record");
    }

    if (
      upload.required_document_id &&
      (body.verificationStatus === "verified" ||
        body.verificationStatus === "waived" ||
        body.verificationStatus === "rejected")
    ) {
      await supabase
        .from("contract_required_documents")
        .update({
          requirement_status:
            body.verificationStatus === "verified"
              ? "verified"
              : body.verificationStatus === "waived"
                ? "waived"
                : "rejected",
          verified_at: body.verificationStatus === "verified" ? now : null,
          notes: body.notes ?? null,
        })
        .eq("id", upload.required_document_id)
        .eq("deal_id", id);
    }

    if (
      upload.required_document_id &&
      (body.verificationStatus === "verified" ||
        body.verificationStatus === "waived")
    ) {
      await supabase
        .from("contract_gap_events")
        .update({
          gap_status: "resolved",
          resolved_at: now,
          resolution_action: `Upload ${body.verificationStatus}.`,
        })
        .eq("deal_id", id)
        .eq("metadata->>documentType", upload.document_type)
        .in("gap_status", ["open", "in_progress"]);
    }

    await supabase.from("document_verification_events").insert({
      deal_id: id,
      upload_id: upload.id,
      required_document_id: upload.required_document_id ?? null,
      document_type: upload.document_type,
      previous_verification_status: existingUpload.verification_status ?? null,
      next_verification_status:
        body.verificationStatus ?? upload.verification_status,
      previous_upload_status: existingUpload.upload_status ?? null,
      next_upload_status: body.uploadStatus ?? upload.upload_status,
      verification_notes: body.notes ?? null,
      event_source: "operator",
      metadata: {
        fileName: upload.file_name,
    },
  });

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "document_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      upload,
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