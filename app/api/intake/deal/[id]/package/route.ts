// app/api/intake/deal/[id]/package/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { buildDealPackage } from "@/lib/deal-engine/package-builder";
import { triggerDealAutoProgression } from "@/lib/deal-engine/auto-progress-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const createRequestSchema = z.object({
  packageType: z.enum(["teaser", "full"]),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = createRequestSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [
      { data: deal, error: dealError },
      { data: demandEstimate, error: demandError },
      { data: economicStack, error: economicError },
      { data: supplierSequences, error: supplierError },
      { data: existingPackages, error: packagesError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),
      supabase
        .from("deal_demand_estimates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("deal_economic_stack_decisions")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),
      supabase
        .from("supplier_sequence_plans")
        .select("*")
        .eq("deal_id", id)
        .order("sequence_position", { ascending: true }),
      supabase
        .from("deal_packages")
        .select("id, package_version, status")
        .eq("deal_id", id)
        .order("package_version", { ascending: false }),
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }
    if (demandError) throw new Error(demandError.message);
    if (economicError) throw new Error(economicError.message);
    if (supplierError) throw new Error(supplierError.message);
    if (packagesError) throw new Error(packagesError.message);

    const built = buildDealPackage({
      deal,
      demandEstimate,
      economicStack,
      supplierSequences: Array.isArray(supplierSequences)
        ? supplierSequences.map((sequence) => ({
            supplier_entity_id:
              typeof sequence.supplier_entity_id === "string"
                ? sequence.supplier_entity_id
                : null,
            sequence_type:
              typeof sequence.sequence_type === "string"
                ? sequence.sequence_type
                : null,
            sequence_position:
              typeof sequence.sequence_position === "number"
                ? sequence.sequence_position
                : null,
            visibility_tier:
              typeof sequence.visibility_tier === "string"
                ? sequence.visibility_tier
                : null,
            package_audience:
              typeof sequence.package_audience === "string"
                ? sequence.package_audience
                : null,
            is_primary:
              typeof sequence.is_primary === "boolean"
                ? sequence.is_primary
                : null,
            hold_reason:
              typeof sequence.hold_reason === "string"
                ? sequence.hold_reason
                : null,
            metadata:
              sequence.metadata && typeof sequence.metadata === "object"
                ? (sequence.metadata as Record<string, unknown>)
                : null,
          }))
        : [],
      packageType: body.packageType,
    });

    const nextVersion =
      Array.isArray(existingPackages) && existingPackages.length > 0
        ? Math.max(
            ...existingPackages.map((pkg) =>
              typeof pkg.package_version === "number" ? pkg.package_version : 0,
            ),
          ) + 1
        : 1;

    const { data: insertedPackage, error: insertError } = await supabase
      .from("deal_packages")
      .insert({
        deal_id: id,
        package_version: nextVersion,
        package_type: body.packageType,
        audience: built.audience,
        status: "draft",
        title: built.title,
        summary: built.summary,
        package_payload: built.payload,
        generated_by: "api_package_builder",
      })
      .select("*")
      .single();

    if (insertError || !insertedPackage) {
      throw new Error(insertError?.message ?? "Failed to create package");
    }

void triggerDealAutoProgression({
  dealId: id,
  triggerSource: "package_generated",
});

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packageRecord: insertedPackage,
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

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    const packageType = searchParams.get("packageType");
    const status = searchParams.get("status");
    const latestOnly = searchParams.get("latestOnly") === "true";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let query = supabase
      .from("deal_packages")
      .select("*")
      .eq("deal_id", id)
      .order("package_version", { ascending: false });

    if (packageType === "teaser" || packageType === "full") {
      query = query.eq("package_type", packageType);
    }

    if (
      status === "draft" ||
      status === "approved" ||
      status === "shared" ||
      status === "superseded" ||
      status === "archived"
    ) {
      query = query.eq("status", status);
    }

    if (latestOnly) {
      query = query.limit(1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packages: data ?? [],
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