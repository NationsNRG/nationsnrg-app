// app/api/intake/deal/[id]/counterparties/[counterpartyId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    counterpartyId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "set_active",
    "set_inactive",
    "set_blocked",
    "set_archived",
    "set_visibility",
    "update_notes",
  ]),
  visibilityLevel: z
    .enum(["internal_only", "teaser_ok", "qualified_ok", "execution_ok"])
    .optional(),
  notes: z.string().trim().nullable().optional(),
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
): Promise<NextResponse> {
  try {
    const { id, counterpartyId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: existingCounterparty, error: existingError } = await supabase
      .from("deal_counterparties")
      .select("*")
      .eq("id", counterpartyId)
      .eq("deal_id", id)
      .single();

    if (existingError || !existingCounterparty) {
      throw new Error(existingError?.message ?? "Counterparty not found");
    }

    if (body.action === "set_visibility") {
      if (!body.visibilityLevel) {
        throw new Error("visibilityLevel is required for set_visibility");
      }

      const { data, error } = await supabase
        .from("deal_counterparties")
        .update({
          visibility_level: body.visibilityLevel,
          metadata: mergeMetadata(existingCounterparty.metadata, {
            lastAction: "set_visibility",
            visibilityUpdatedBy: "operator_action",
          }),
        })
        .eq("id", counterpartyId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update visibility");
      }

      return NextResponse.json(
        {
          ok: true,
          counterparty: data,
        },
        { status: 200 },
      );
    }

    if (body.action === "update_notes") {
      const { data, error } = await supabase
        .from("deal_counterparties")
        .update({
          notes: body.notes ?? null,
          metadata: mergeMetadata(existingCounterparty.metadata, {
            lastAction: "update_notes",
            notesUpdatedBy: "operator_action",
          }),
        })
        .eq("id", counterpartyId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update notes");
      }

      return NextResponse.json(
        {
          ok: true,
          counterparty: data,
        },
        { status: 200 },
      );
    }

    const statusMap: Record<
      "set_active" | "set_inactive" | "set_blocked" | "set_archived",
      "active" | "inactive" | "blocked" | "archived"
    > = {
      set_active: "active",
      set_inactive: "inactive",
      set_blocked: "blocked",
      set_archived: "archived",
    };

    const nextStatus =
      body.action in statusMap
        ? statusMap[
            body.action as
              | "set_active"
              | "set_inactive"
              | "set_blocked"
              | "set_archived"
          ]
        : existingCounterparty.status;

    const { data, error } = await supabase
      .from("deal_counterparties")
      .update({
        status: nextStatus,
        metadata: mergeMetadata(existingCounterparty.metadata, {
          lastAction: body.action,
          statusUpdatedBy: "operator_action",
        }),
      })
      .eq("id", counterpartyId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update counterparty status");
    }

    return NextResponse.json(
      {
        ok: true,
        counterparty: data,
      },
      { status: 200 },
    );
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