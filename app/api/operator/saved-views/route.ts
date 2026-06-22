// app/api/operator/saved-views/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/require-api-role";

const createSchema = z.object({
  viewScope: z.enum(["intake_dashboard", "big_deal_desk", "portfolio_rollup"]),
  viewName: z.string().trim().min(1),
  viewDescription: z.string().trim().nullable().optional(),
  filterPayload: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const viewScope = searchParams.get("viewScope");

    const supabase = getServiceClient();

    let query = supabase
      .from("operator_saved_views")
      .select("*")
      .order("is_system_view", { ascending: false })
      .order("view_name", { ascending: true });

    if (
      viewScope === "intake_dashboard" ||
      viewScope === "big_deal_desk" ||
      viewScope === "portfolio_rollup"
    ) {
      query = query.eq("view_scope", viewScope);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      savedViews: data ?? [],
    });
  } catch (error) {
return fail(error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = createSchema.parse(await request.json());

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("operator_saved_views")
      .insert({
        view_scope: body.viewScope,
        view_name: body.viewName,
        view_description: body.viewDescription ?? null,
        filter_payload: body.filterPayload,
        is_system_view: false,
        created_by: "operator",
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to save view");
    }

    return ok({
      savedView: data,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}