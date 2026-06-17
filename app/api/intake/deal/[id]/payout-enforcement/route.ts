// app/api/intake/deal/[id]/payout-enforcement/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ id: string }>;
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
      .from("payout_enforcement_events")
      .select("*")
      .eq("deal_id", id)
      .order("enforcement_severity", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      dealId: id,
      enforcementEvents: data ?? [],
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