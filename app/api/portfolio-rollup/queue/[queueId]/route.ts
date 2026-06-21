// app/api/portfolio-rollup/queue/[queueId]/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/require-api-role";


interface RouteContext {
  params: Promise<{
    queueId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "assign_cluster_key",
    "release_to_execution",
    "cancel_hold",
    "update_release_reason",
  ]),
  assignedClusterKey: z.string().trim().nullable().optional(),
  releaseReason: z.string().trim().nullable().optional(),
});

function mergeMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...base,
    ...patch,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { queueId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = getServiceClient();

    const { data: existingQueue, error: existingError } = await supabase
      .from("portfolio_rollup_queue")
      .select("*")
      .eq("id", queueId)
      .maybeSingle();

    if (existingError || !existingQueue) {
      throw new Error(existingError?.message ?? "Rollup queue record not found");
    }

    if (body.action === "assign_cluster_key") {
      const { data, error } = await supabase
        .from("portfolio_rollup_queue")
        .update({
          assigned_cluster_key: body.assignedClusterKey ?? null,
          metadata: mergeMetadata(existingQueue.metadata, {
            lastRollupAction: "assign_cluster_key",
            lastRollupActionAt: new Date().toISOString(),
          }),
        })
        .eq("id", queueId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to assign cluster key");
      }

      return ok({
        rollupRecord: data,
      });
    }

    if (body.action === "update_release_reason") {
      const { data, error } = await supabase
        .from("portfolio_rollup_queue")
        .update({
          release_reason: body.releaseReason ?? null,
          metadata: mergeMetadata(existingQueue.metadata, {
            lastRollupAction: "update_release_reason",
            lastRollupActionAt: new Date().toISOString(),
          }),
        })
        .eq("id", queueId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update release reason");
      }

      return ok({
        rollupRecord: data,
      });
    }

    if (body.action === "release_to_execution") {
      const { data, error } = await supabase
        .from("portfolio_rollup_queue")
        .update({
          hold_status: "released",
          released_to_execution: true,
          release_reason:
            body.releaseReason ?? existingQueue.release_reason ?? "Released by operator",
          metadata: mergeMetadata(existingQueue.metadata, {
            lastRollupAction: "release_to_execution",
            lastRollupActionAt: new Date().toISOString(),
          }),
        })
        .eq("id", queueId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to release rollup hold");
      }

      return ok({
        rollupRecord: data,
      });
    }

    const { data, error } = await supabase
      .from("portfolio_rollup_queue")
      .update({
        hold_status: "cancelled",
        released_to_execution: false,
        release_reason:
          body.releaseReason ?? existingQueue.release_reason ?? "Cancelled by operator",
        metadata: mergeMetadata(existingQueue.metadata, {
          lastRollupAction: "cancel_hold",
          lastRollupActionAt: new Date().toISOString(),
        }),
      })
      .eq("id", queueId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to cancel rollup hold");
    }

    return ok({
      rollupRecord: data,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}