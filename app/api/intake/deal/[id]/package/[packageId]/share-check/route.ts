// app/api/intake/deal/[id]/package/[packageId]/share-check/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { canCounterpartyReceivePackage } from "@/lib/deal-engine/disclosure-gates";

interface RouteContext {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
}

const requestSchema = z.object({
  counterpartyId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, packageId } = await context.params;
    const body = requestSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [{ data: pkg, error: pkgError }, { data: counterparty, error: cpError }] =
      await Promise.all([
        supabase
          .from("deal_packages")
          .select("*")
          .eq("id", packageId)
          .eq("deal_id", id)
          .single(),
        supabase
          .from("deal_counterparties")
          .select("*")
          .eq("id", body.counterpartyId)
          .eq("deal_id", id)
          .single(),
      ]);

    if (pkgError || !pkg) {
      throw new Error(pkgError?.message ?? "Package not found");
    }

    if (cpError || !counterparty) {
      throw new Error(cpError?.message ?? "Counterparty not found");
    }

    const decision = canCounterpartyReceivePackage({
      counterparty: {
        counterpartyId: String(counterparty.id),
        counterpartyType: String(counterparty.counterparty_type),
        counterpartyName: String(counterparty.counterparty_name),
        status: String(counterparty.status),
        visibilityLevel: counterparty.visibility_level,
      },
      packageContext: {
        packageType: pkg.package_type,
        audience: pkg.audience,
        packageStatus: pkg.status,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packageId,
        counterpartyId: body.counterpartyId,
        disclosureDecision: decision,
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