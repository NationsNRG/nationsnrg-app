// app/api/intake/deal/list/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, business_name, state, estimated_monthly_bill, intake_source, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      deals: data ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}