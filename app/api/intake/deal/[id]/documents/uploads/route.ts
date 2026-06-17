// app/api/intake/deal/[id]/documents/uploads/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  requiredDocumentId: z.string().trim().nullable().optional(),
  documentType: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileMimeType: z.string().trim().nullable().optional(),
  fileSizeBytes: z.number().int().min(0).nullable().optional(),
  storageBucket: z.string().trim().nullable().optional(),
  storagePath: z.string().trim().nullable().optional(),
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
      .from("document_upload_records")
      .select("*")
      .eq("deal_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      uploads: data ?? [],
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

    const { data: upload, error } = await supabase
      .from("document_upload_records")
      .insert({
        deal_id: id,
        required_document_id: body.requiredDocumentId ?? null,
        document_type: body.documentType,
        file_name: body.fileName,
        file_mime_type: body.fileMimeType ?? null,
        file_size_bytes: body.fileSizeBytes ?? null,
        storage_bucket: body.storageBucket ?? null,
        storage_path: body.storagePath ?? null,
        upload_status: body.storagePath ? "uploaded" : "metadata_only",
        verification_status: "pending",
        uploaded_by: "operator",
        notes: body.notes ?? null,
        metadata: {
          placeholderUpload: !body.storagePath,
          createdFrom: "document_upload_placeholder",
        },
      })
      .select("*")
      .single();

    if (error || !upload) {
      throw new Error(error?.message ?? "Failed to create upload record");
    }

    if (body.requiredDocumentId) {
      await supabase
        .from("contract_required_documents")
        .update({
          requirement_status: "received",
          received_at: new Date().toISOString(),
          notes: body.notes ?? null,
        })
        .eq("id", body.requiredDocumentId)
        .eq("deal_id", id);
    }

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