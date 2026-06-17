// app/api/intake/deal/[id]/retained-rights/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  rightType: z.enum([
    "future_expansion",
    "project_follow_on",
    "buyer_relationship",
    "site_portfolio",
    "data_rights",
    "marketplace_rights",
    "other",
  ]),
  rightSummary: z.string().trim().min(1),
  protectedUntil: z.string().trim().nullable().optional(),
  counterpartyIdentifier: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  teamExpansionIncluded: z.boolean().default(false),
  limitedOperatorInvolvement: z.boolean().default(true),
  accountabilityStructureRequired: z.boolean().default(true),
  liabilityBoundaryRequired: z.boolean().default(true),
});

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("retained_right_events")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      retainedRights: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

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

    const expansionClauses: string[] = [];

    if (body.teamExpansionIncluded) {
      expansionClauses.push(
        "NationsNRG reserves the right to assign sales team members, account managers, operators, or approved representatives to support future expansion and account execution.",
      );
    }

    if (body.limitedOperatorInvolvement) {
      expansionClauses.push(
        "Founder/operator involvement may be limited; execution responsibilities may be delegated through NationsNRG-approved workflows and accountable team roles.",
      );
    }

    if (body.accountabilityStructureRequired) {
      expansionClauses.push(
        "Assigned team members or partners must operate under defined accountability standards, task ownership, reporting expectations, and escalation rules.",
      );
    }

    if (body.liabilityBoundaryRequired) {
      expansionClauses.push(
        "NationsNRG reserves the right to define liability boundaries so no party assumes unintended responsibility for work outside its authorized role, scope, or written approval.",
      );
    }

    const rightSummaryWithClauses =
      expansionClauses.length > 0
        ? `${body.rightSummary}\n\nExpansion / Accountability Clauses:\n- ${expansionClauses.join("\n- ")}`
        : body.rightSummary;

    const { data, error } = await supabase
      .from("retained_right_events")
      .insert({
        deal_id: id,
        right_type: body.rightType,
        right_status: "reserved",
        right_summary: rightSummaryWithClauses,
        protected_until:
          body.protectedUntil && body.protectedUntil.trim() !== ""
            ? new Date(body.protectedUntil).toISOString()
            : null,
        counterparty_identifier: body.counterpartyIdentifier ?? null,
        notes: body.notes ?? null,
        metadata: {
          strategy: "360_future_expansion_rights",
          teamExpansionIncluded: body.teamExpansionIncluded,
          limitedOperatorInvolvement: body.limitedOperatorInvolvement,
          accountabilityStructureRequired: body.accountabilityStructureRequired,
          liabilityBoundaryRequired: body.liabilityBoundaryRequired,
          principle:
            "NationsNRG can remain the preferred deal partner while delegating execution responsibly and preserving future upside.",
        },
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        JSON.stringify({
          message: error?.message ?? "Failed to create retained right",
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        }),
      );
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      retainedRight: data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}