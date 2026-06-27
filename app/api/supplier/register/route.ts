import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireApiRole(request, ["admin", "operator", "supplier"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        company_name: body.company_name,
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone ?? null,
        territories: body.territories ?? [],
        min_volume_mwh: body.min_volume_mwh ?? 100,
        credit_rating: body.credit_rating ?? "investment",
        user_id: auth.user.id,
        portal_status: "pending",
        is_active: true,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Supplier profile was not created." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, supplier: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}