// app/api/intake/deal/[id]/epc-recommendation/route.ts

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
      .from("epc_deal_fit_scores")
      .select(
        `
        *,
        epc_partner_profiles (
          epc_name,
          primary_contact_name,
          primary_contact_email,
          coverage_states,
          preferred_project_types,
          financing_appetite,
          disclosure_tolerance
        )
      `,
      )
      .eq("deal_id", id)
      .order("recommendation_rank", { ascending: true })
      .order("fit_score", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      recommendations: data ?? [],
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