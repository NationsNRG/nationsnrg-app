// app/api/intake/dashboard/queues/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function GET(request: Request) {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = getServiceClient();

    const [
      { data: recentDeals, error: recentDealsError },
      { data: bigDeals, error: bigDealsError },
      { data: rollups, error: rollupsError },
      { data: latestPackages, error: packagesError },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("id,business_name,state,estimated_monthly_bill,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("big_deal_desk_queue")
        .select("id,deal_id,triage_lane,triage_score,escalation_status,queued_at")
        .in("escalation_status", ["queued", "under_review"])
        .order("triage_score", { ascending: false })
        .limit(5),

      supabase
        .from("portfolio_rollup_queue")
        .select("id,deal_id,state,rollup_lane,aggregation_score,hold_status,created_at")
        .eq("hold_status", "held")
        .order("aggregation_score", { ascending: false })
        .limit(5),

      supabase
        .from("deal_packages")
        .select("id,deal_id,package_version,package_type,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (recentDealsError) throw new Error(recentDealsError.message);
    if (bigDealsError) throw new Error(bigDealsError.message);
    if (rollupsError) throw new Error(rollupsError.message);
    if (packagesError) throw new Error(packagesError.message);

    return ok({
      queues: {
        recentDeals: recentDeals ?? [],
        bigDeals: bigDeals ?? [],
        rollups: rollups ?? [],
        latestPackages: latestPackages ?? [],
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}