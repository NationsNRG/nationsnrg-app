// app/api/intake/deal/[id]/package/[packageId]/visibility/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluatePackageVisibility } from "@/lib/deal-engine/package-visibility";
import type { DisclosureCounterparty } from "@/lib/deal-engine/disclosure-gates";

interface RouteContext {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, packageId } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [{ data: pkg, error: pkgError }, { data: counterparties, error: cpError }] =
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
          .eq("deal_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (pkgError || !pkg) {
      throw new Error(pkgError?.message ?? "Package not found");
    }

    if (cpError) {
      throw new Error(cpError.message);
    }

    const normalizedCounterparties: DisclosureCounterparty[] = Array.isArray(counterparties)
      ? counterparties.map((counterparty) => ({
          counterpartyId: String(counterparty.id),
          counterpartyType: String(counterparty.counterparty_type),
          counterpartyName: String(counterparty.counterparty_name),
          status: String(counterparty.status),
          visibilityLevel: counterparty.visibility_level as DisclosureCounterparty["visibilityLevel"],
        }))
      : [];

    const result = evaluatePackageVisibility({
      packageType: pkg.package_type,
      audience: pkg.audience,
      packageStatus: pkg.status,
      counterparties: normalizedCounterparties,
    });

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packageId,
        packageContext: {
          packageType: pkg.package_type,
          audience: pkg.audience,
          status: pkg.status,
        },
        visibility: result,
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