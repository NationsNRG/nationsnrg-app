// app/api/intake/deal/[id]/execution-checklist/route.ts

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

    const { data: checklist, error: checklistError } = await supabase
      .from("execution_checklists")
      .select("*")
      .eq("deal_id", id)
      .eq("checklist_type", "deal_execution")
      .maybeSingle();

    if (checklistError) throw new Error(checklistError.message);

    const { data: items, error: itemsError } = await supabase
      .from("execution_checklist_items")
      .select("*")
      .eq("deal_id", id)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });

    if (itemsError) throw new Error(itemsError.message);

    const { data: gates, error: gatesError } = await supabase
      .from("execution_gate_events")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (gatesError) throw new Error(gatesError.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      checklist: checklist ?? null,
      items: items ?? [],
      gates: gates ?? [],
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