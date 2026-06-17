// app/api/intake/deal/[id]/supplier-responses/analytics/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type ResponseEvent = {
  response_type: string | null;
  response_status: string | null;
  confidence_signal: number | null;
  response_speed_hours: number | null;
  supplier_sequence_id: string | null;
  created_at: string | null;
};

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

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
      .from("supplier_response_events")
      .select(
        "response_type,response_status,confidence_signal,response_speed_hours,supplier_sequence_id,created_at",
      )
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const events: ResponseEvent[] = Array.isArray(data) ? data : [];

    const totals = {
      totalResponses: events.length,
      interestCount: events.filter((e) => e.response_type === "interest").length,
      declineCount: events.filter((e) => e.response_type === "decline").length,
      objectionCount: events.filter((e) => e.response_type === "objection").length,
      counterCount: events.filter((e) => e.response_type === "counter").length,
      rfiCount: events.filter((e) => e.response_type === "request_for_info").length,
      nonStarterCount: events.filter((e) => e.response_type === "non_starter").length,
    };

    const confidenceValues = events
      .map((e) => e.confidence_signal)
      .filter((v): v is number => typeof v === "number");

    const speedValues = events
      .map((e) => e.response_speed_hours)
      .filter((v): v is number => typeof v === "number");

    const bySequence = events.reduce<Record<string, number>>((acc, e) => {
      const key =
        typeof e.supplier_sequence_id === "string"
          ? e.supplier_sequence_id
          : "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        analytics: {
          totals,
          averageConfidence: avg(confidenceValues),
          averageResponseSpeedHours: avg(speedValues),
          responsesBySequence: bySequence,
          latestResponse: events.length > 0 ? events[0] : null,
        },
      },
      { status: 200 },
    );
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