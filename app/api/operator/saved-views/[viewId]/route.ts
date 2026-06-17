// app/api/operator/saved-views/[viewId]/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{
    viewId: string;
  }>;
}

const patchSchema = z.object({
  viewName: z.string().trim().min(1).optional(),
  viewDescription: z.string().trim().nullable().optional(),
  filterPayload: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { viewId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = getServiceClient();

    const { data: existingView, error: existingError } = await supabase
      .from("operator_saved_views")
      .select("id,is_system_view")
      .eq("id", viewId)
      .maybeSingle();

    if (existingError || !existingView) {
      throw new Error(existingError?.message ?? "Saved view not found");
    }

    if (existingView.is_system_view === true) {
      return fail("System saved views are locked and cannot be edited.", 403, {
        locked: true,
      });
    }

    const updatePayload: Record<string, unknown> = {};

    if (body.viewName !== undefined) {
      updatePayload.view_name = body.viewName;
    }

    if (body.viewDescription !== undefined) {
      updatePayload.view_description = body.viewDescription;
    }

    if (body.filterPayload !== undefined) {
      updatePayload.filter_payload = body.filterPayload;
    }

    const { data, error } = await supabase
      .from("operator_saved_views")
      .update(updatePayload)
      .eq("id", viewId)
      .eq("is_system_view", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update saved view");
    }

    return ok({
      savedView: data,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { viewId } = await context.params;

    const supabase = getServiceClient();

    const { data: existingView, error: existingError } = await supabase
      .from("operator_saved_views")
      .select("id,is_system_view,view_name")
      .eq("id", viewId)
      .maybeSingle();

    if (existingError || !existingView) {
      throw new Error(existingError?.message ?? "Saved view not found");
    }

    if (existingView.is_system_view === true) {
    return fail("System saved views are locked and cannot be deleted.", 403, {
        locked: true,
      });
    }

    const { error: deleteError } = await supabase
      .from("operator_saved_views")
      .delete()
      .eq("id", viewId)
      .eq("is_system_view", false);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return ok({
      deletedViewId: viewId,
      deletedViewName: existingView.view_name,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}