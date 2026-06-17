// app/api/big-deal-desk/queue/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("big_deal_desk_queue")
      .select("*")
      .order("triage_score", { ascending: false });

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