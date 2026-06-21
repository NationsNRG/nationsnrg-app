// app/api/system/deal-runner/history/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function GET(
  request: Request,
): Promise<NextResponse> {
  const auth = await requireApiRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("deal_runner_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      history: data ?? [],
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