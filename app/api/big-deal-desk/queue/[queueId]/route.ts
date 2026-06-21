// app/api/big-deal-desk/queue/[queueId]/route.ts

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
    "set_under_review",
    "approve",
    "reject",
    "return",
    "assign_owner",
    "update_notes",
  ]),
  assignedOwner: z.string().trim().nullable().optional(),
  reviewNotes: z.string().trim().nullable().optional(),
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
) {
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
      .from("big_deal_desk_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    if (existingError || !existingQueue) {
      throw new Error(existingError?.message ?? "Queue record not found");
    }

    if (body.action === "assign_owner") {
      const { data, error } = await supabase
        .from("big_deal_desk_queue")
        .update({
          assigned_owner: body.assignedOwner ?? null,
          metadata: mergeMetadata(existingQueue.metadata, {
            lastDeskAction: "assign_owner",
            lastDeskActionAt: new Date().toISOString(),
          }),
        })
        .eq("id", queueId)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to assign owner");
      }

      return ok({
        queueRecord: data,
      });
    }

    if (body.action === "update_notes") {
      const { data, error } = await supabase
        .from("big_deal_desk_queue")
        .update({
          review_notes: body.reviewNotes ?? null,
          metadata: mergeMetadata(existingQueue.metadata, {
            lastDeskAction: "update_notes",
            lastDeskActionAt: new Date().toISOString(),
          }),
        })
        .eq("id", queueId)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update review notes");
      }

      return ok({
        queueRecord: data,
      });
    }

    const statusMap: Record<
      "set_under_review" | "approve" | "reject" | "return",
      "under_review" | "approved" | "rejected" | "returned"
    > = {
      set_under_review: "under_review",
      approve: "approved",
      reject: "rejected",
      return: "returned",
    };

    const nextStatus = statusMap[
      body.action as "set_under_review" | "approve" | "reject" | "return"
    ];

    const { data, error } = await supabase
      .from("big_deal_desk_queue")
      .update({
        escalation_status: nextStatus,
        review_notes:
          body.reviewNotes !== undefined
            ? body.reviewNotes ?? null
            : existingQueue.review_notes,
        reviewed_at:
          body.action === "approve" ||
          body.action === "reject" ||
          body.action === "return"
            ? new Date().toISOString()
            : existingQueue.reviewed_at,
        metadata: mergeMetadata(existingQueue.metadata, {
          lastDeskAction: body.action,
          lastDeskActionAt: new Date().toISOString(),
        }),
      })
      .eq("id", queueId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update queue status");
    }

    return ok({
      queueRecord: data,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}