// app/api/intake/dashboard/summary/route.ts

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
      { count: totalDeals, error: dealsError },
      { count: bigDealQueue, error: bigDealError },
      { count: rollupHeld, error: rollupError },
      { count: supplierSequences, error: sequencesError },
      { count: packages, error: packagesError },
      { count: shareEvents, error: shareEventsError },
        ] = await Promise.all([
      supabase.from("deals").select("id", { count: "exact", head: true }),

      supabase
        .from("big_deal_desk_queue")
        .select("id", { count: "exact", head: true })
        .in("escalation_status", ["queued", "under_review"]),

      supabase
        .from("portfolio_rollup_queue")
        .select("id", { count: "exact", head: true })
        .eq("hold_status", "held"),

      supabase
        .from("supplier_sequence_plans")
        .select("id", { count: "exact", head: true }),

      supabase.from("deal_packages").select("id", {
        count: "exact",
        head: true,
      }),

      supabase
        .from("deal_package_share_events")
        .select("id", { count: "exact", head: true }),
    ]);

    if (dealsError) throw new Error(dealsError.message);
    if (bigDealError) throw new Error(bigDealError.message);
    if (rollupError) throw new Error(rollupError.message);
    if (sequencesError) throw new Error(sequencesError.message);
    if (packagesError) throw new Error(packagesError.message);
    if (shareEventsError) throw new Error(shareEventsError.message);

    return ok({
      summary: {
        totalDeals: totalDeals ?? 0,
        bigDealQueue: bigDealQueue ?? 0,
        rollupHeld: rollupHeld ?? 0,
        supplierSequences: supplierSequences ?? 0,
        packages: packages ?? 0,
        shareEvents: shareEvents ?? 0,
      },
    });
  } catch (error) {
        return fail(error instanceof Error ? error.message : "Unknown error");
  }
}