// app/api/intake/deal/[id]/compensation-claims/route.ts

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

    const [
      { data: commissionClaims, error: commissionError },
      { data: referralClaims, error: referralError },
      { data: successClaims, error: successError },
    ] = await Promise.all([
      supabase
        .from("commission_claims")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("referral_fee_claims")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("success_fee_claims")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (commissionError) throw new Error(commissionError.message);
    if (referralError) throw new Error(referralError.message);
    if (successError) throw new Error(successError.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      claims: {
        commissionClaims: commissionClaims ?? [],
        referralClaims: referralClaims ?? [],
        successClaims: successClaims ?? [],
      },
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