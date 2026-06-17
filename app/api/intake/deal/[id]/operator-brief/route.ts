// app/api/intake/deal/[id]/operator-brief/route.ts

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
      .from("operator_briefs")
      .select("*")
      .eq("deal_id", id)
      .eq("brief_type", "deal_operator_brief")
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      operatorBrief: data ?? null,
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