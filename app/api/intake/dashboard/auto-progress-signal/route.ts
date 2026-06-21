import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function GET(
  request: Request,
): Promise<NextResponse> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date();
    const staleCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 48h
    const warningCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24h

    const [
      { count: totalDeals, error: totalError },
      { count: recentlyUpdated, error: recentError },
      { count: staleDeals, error: staleError },
      { data: staleList, error: staleListError },
    ] = await Promise.all([
      supabase.from("deals").select("id", { count: "exact", head: true }),

      supabase
        .from("deal_auto_progression_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", warningCutoff.toISOString()),

      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .lt("created_at", staleCutoff.toISOString())
        .not("status", "in", "(won,lost)"),

      supabase
        .from("deals")
        .select("id,business_name,status,created_at")
        .lt("created_at", staleCutoff.toISOString())
        .not("status", "in", "(won,lost)")
        .order("created_at", { ascending: true })
        .limit(5),
    ]);

    if (totalError) throw new Error(totalError.message);
    if (recentError) throw new Error(recentError.message);
    if (staleError) throw new Error(staleError.message);
    if (staleListError) throw new Error(staleListError.message);

    const healthScore =
      totalDeals && totalDeals > 0
        ? Math.round(((recentlyUpdated ?? 0) / totalDeals) * 100)
        : 100;

    let healthStatus: "healthy" | "warning" | "critical" = "healthy";

    if ((staleDeals ?? 0) > 10) {
      healthStatus = "critical";
    } else if ((staleDeals ?? 0) > 3) {
      healthStatus = "warning";
    }

    return NextResponse.json({
      ok: true,
      signal: {
        totalDeals: totalDeals ?? 0,
        recentlyUpdated: recentlyUpdated ?? 0,
        staleDeals: staleDeals ?? 0,
        healthScore,
        healthStatus,
        staleList: staleList ?? [],
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