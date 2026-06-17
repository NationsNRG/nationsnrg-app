// app/api/intake/deal/[id]/contract-readiness/documents/seed/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const REQUIRED_DOCUMENTS = [
  {
    document_type: "utility_bill",
    document_label: "Recent Utility Bill",
    required_for_stage: "supplier_release",
  },
  {
    document_type: "usage_history",
    document_label: "12-Month Usage History",
    required_for_stage: "pricing",
  },
  {
    document_type: "loa",
    document_label: "Letter of Authorization",
    required_for_stage: "supplier_release",
  },
  {
    document_type: "service_address_validation",
    document_label: "Service Address Validation",
    required_for_stage: "pricing",
  },
  {
    document_type: "authorized_signer_confirmation",
    document_label: "Authorized Signer Confirmation",
    required_for_stage: "contracting",
  },
  {
    document_type: "compensation_acknowledgment",
    document_label: "Compensation Protection Acknowledgment",
    required_for_stage: "execution",
  },
];

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

    const rows = REQUIRED_DOCUMENTS.map((doc) => ({
      deal_id: id,
      document_type: doc.document_type,
      document_label: doc.document_label,
      requirement_status: "missing",
      required_for_stage: doc.required_for_stage,
      is_required: true,
      metadata: {
        seededBy: "contract_readiness_seed",
      },
    }));

    const { data, error } = await supabase
      .from("contract_required_documents")
      .upsert(rows, {
        onConflict: "deal_id,document_type",
        ignoreDuplicates: false,
      })
      .select("*");

    if (error) {
      throw new Error(error.message);
    }

    const gapRows = rows.map((row) => ({
      deal_id: id,
      gap_type:
        row.document_type === "authorized_signer_confirmation"
          ? "authority_gap"
          : row.document_type === "compensation_acknowledgment"
            ? "compensation_gap"
            : "missing_document",
      gap_severity:
        row.document_type === "compensation_acknowledgment" ||
        row.document_type === "authorized_signer_confirmation"
          ? 5
          : 3,
      gap_status: "open",
      gap_title: `Missing ${row.document_label}`,
      gap_description: `${row.document_label} is required for ${row.required_for_stage}.`,
      resolution_action: `Collect and verify ${row.document_label}.`,
      metadata: {
        documentType: row.document_type,
        seededBy: "contract_readiness_seed",
      },
    }));

    const { error: deleteGapError } = await supabase
      .from("contract_gap_events")
      .delete()
      .eq("deal_id", id)
      .eq("metadata->>seededBy", "contract_readiness_seed");

    if (deleteGapError) {
      throw new Error(deleteGapError.message);
    }

    const { data: gaps, error: gapError } = await supabase
      .from("contract_gap_events")
      .insert(gapRows)
      .select("*");

    if (gapError) {
      throw new Error(gapError.message);
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "document_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      documents: data ?? [],
      gaps: gaps ?? [],
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