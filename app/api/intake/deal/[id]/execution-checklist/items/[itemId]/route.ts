// app/api/intake/deal/[id]/execution-checklist/items/[itemId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_open",
    "mark_in_progress",
    "mark_completed",
    "mark_blocked",
    "mark_waived",
    "assign_owner",
  ]),
  ownerType: z
    .enum([
      "operator",
      "sales_team",
      "account_manager",
      "supplier",
      "epc",
      "buyer",
      "legal",
      "finance",
      "system",
    ])
    .optional(),
  ownerIdentifier: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const statusByAction = {
  mark_open: "open",
  mark_in_progress: "in_progress",
  mark_completed: "completed",
  mark_blocked: "blocked",
  mark_waived: "waived",
} as const;

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, itemId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      notes: body.notes ?? undefined,
      metadata: {
        lastChecklistAction: body.action,
        lastChecklistActionAt: now,
      },
    };

    if (body.action !== "assign_owner") {
      updatePayload.item_status = statusByAction[body.action];
      updatePayload.completed_at =
        body.action === "mark_completed" ? now : null;
      updatePayload.waived_at = body.action === "mark_waived" ? now : null;
    }

    if (body.ownerType !== undefined) {
      updatePayload.owner_type = body.ownerType;
    }

    if (body.ownerIdentifier !== undefined) {
      updatePayload.owner_identifier = body.ownerIdentifier;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("execution_checklist_items")
      .update(updatePayload)
      .eq("id", itemId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update checklist item");
    }

    return NextResponse.json({
      ok: true,
      dealId: id,
      item: data,
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