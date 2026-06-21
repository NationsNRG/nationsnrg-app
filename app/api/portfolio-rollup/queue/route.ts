// app/api/portfolio-rollup/queue/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function GET(
  request: Request,
): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("portfolio_rollup_queue")
      .select("*")
      .order("aggregation_score", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      queue: data ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}