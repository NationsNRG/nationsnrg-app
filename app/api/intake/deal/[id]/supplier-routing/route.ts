// app/api/intake/deal/[id]/supplier-routing/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import {
  evaluateAutonomousSupplierRouting,
  type SupplierRoutingAnalytics,
  type SupplierRoutingSequence,
} from "@/lib/deal-engine/autonomous-supplier-routing";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function extractMetadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    key in metadata &&
    typeof (metadata as Record<string, unknown>)[key] === "string"
  ) {
    return (metadata as Record<string, unknown>)[key] as string;
  }

  return null;
}

function extractMetadataNumber(
  metadata: unknown,
  key: string,
): number | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    key in metadata &&
    typeof (metadata as Record<string, unknown>)[key] === "number"
  ) {
    return (metadata as Record<string, unknown>)[key] as number;
  }

  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const supabase = getServiceClient();

    const [{ data: sequences, error: sequenceError }, { data: responses, error: responseError }] =
      await Promise.all([
        supabase
          .from("supplier_sequence_plans")
          .select("*")
          .eq("deal_id", id)
          .order("sequence_position", { ascending: true }),
        supabase
          .from("supplier_response_events")
          .select("*")
          .eq("deal_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (sequenceError) {
      throw new Error(sequenceError.message);
    }

    if (responseError) {
      throw new Error(responseError.message);
    }

    const sequenceRows = Array.isArray(sequences) ? sequences : [];
    const responseRows = Array.isArray(responses) ? responses : [];

    const normalizedSequences: SupplierRoutingSequence[] = sequenceRows.map(
      (sequence) => ({
        sequenceId: String(sequence.id),
        supplierEntityId:
          typeof sequence.supplier_entity_id === "string"
            ? sequence.supplier_entity_id
            : "",
        supplierName:
          extractMetadataString(sequence.metadata, "supplierName") ??
          (typeof sequence.supplier_entity_id === "string"
            ? sequence.supplier_entity_id
            : "Supplier"),
        sequenceType:
          typeof sequence.sequence_type === "string"
            ? sequence.sequence_type
            : "unknown",
        sequencePosition:
          typeof sequence.sequence_position === "number"
            ? sequence.sequence_position
            : 0,
        isPrimary:
          typeof sequence.is_primary === "boolean" ? sequence.is_primary : false,
        holdReason:
          typeof sequence.hold_reason === "string" ? sequence.hold_reason : null,
        latestResponseType: extractMetadataString(
          sequence.metadata,
          "latestResponseType",
        ),
        latestResponseStatus: extractMetadataString(
          sequence.metadata,
          "latestResponseStatus",
        ),
        latestConfidenceSignal: extractMetadataNumber(
          sequence.metadata,
          "latestConfidenceSignal",
        ),
        fitScore: extractMetadataNumber(sequence.metadata, "fitScore"),
      }),
    );

    const confidenceValues = responseRows
      .map((row) =>
        typeof row.confidence_signal === "number" ? row.confidence_signal : null,
      )
      .filter((value): value is number => value !== null);

    const speedValues = responseRows
      .map((row) =>
        typeof row.response_speed_hours === "number"
          ? row.response_speed_hours
          : null,
      )
      .filter((value): value is number => value !== null);

    const analytics: SupplierRoutingAnalytics = {
      averageConfidence: average(confidenceValues),
      averageResponseSpeedHours: average(speedValues),
      totals: {
        totalResponses: responseRows.length,
        interestCount: responseRows.filter(
          (row) => row.response_type === "interest",
        ).length,
        declineCount: responseRows.filter(
          (row) => row.response_type === "decline",
        ).length,
        nonStarterCount: responseRows.filter(
          (row) => row.response_type === "non_starter",
        ).length,
        rfiCount: responseRows.filter(
          (row) => row.response_type === "request_for_info",
        ).length,
      },
    };

    const decisions = evaluateAutonomousSupplierRouting({
      sequences: normalizedSequences,
      analytics,
    });

    return ok({
      dealId: id,
      routing: {
        sequences: normalizedSequences,
        analytics,
        decisions,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}