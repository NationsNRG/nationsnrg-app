// app/api/intake/deal/[id]/epc-sequence/create/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  epcProfileId: z.string().trim().min(1),
  epcIdentifier: z.string().trim().min(1),
  sequencePosition: z.number().int().min(1),
  packageLevel: z.enum([
    "none",
    "teaser",
    "qualified_package",
    "full_package",
    "nda_required",
  ]),
  isPrimary: z.boolean().default(false),
  notes: z.string().trim().nullable().optional(),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = createSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (body.isPrimary) {
      await supabase
        .from("epc_sequence_plans")
        .update({ is_primary: false })
        .eq("deal_id", id);
    }

    const { data, error } = await supabase
      .from("epc_sequence_plans")
      .upsert(
        {
          deal_id: id,
          epc_profile_id: body.epcProfileId,
          epc_identifier: body.epcIdentifier,
          sequence_type: "ranked_waterfall",
          sequence_position: body.sequencePosition,
          package_level: body.packageLevel,
          sequence_status: "planned",
          is_primary: body.isPrimary,
          notes: body.notes ?? null,
          metadata: {
            createdFrom: "epc_recommendation_panel",
            principle:
              "Route EPC opportunities to the best-fit partner while protecting disclosure, compensation, accountability, and liability boundaries.",
          },
        },
        { onConflict: "deal_id,epc_profile_id" },
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create EPC sequence plan");
    }

    await supabase.from("epc_recommendation_events").insert({
      deal_id: id,
      epc_profile_id: body.epcProfileId,
      epc_identifier: body.epcIdentifier,
      event_type: "epc_sequence_created",
      event_status: "logged",
      event_title: "EPC sequence plan created",
      event_summary: `Position ${body.sequencePosition}, package ${body.packageLevel}.`,
      recommended_package_level: body.packageLevel,
      triggered_by: "operator",
      metadata: {
        isPrimary: body.isPrimary,
      },
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      epcSequence: data,
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