// app/api/intake/deal/[id]/package/[packageId]/safe-share/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { canCounterpartyReceivePackage } from "@/lib/deal-engine/disclosure-gates";
import { triggerDealAutoProgression } from "@/lib/deal-engine/auto-progress-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
}

const requestSchema = z.object({
  counterpartyId: z.string().trim().min(1),
  shareChannel: z.enum(["email", "portal", "manual", "api", "other"]),
  recipientIdentifier: z.string().trim().min(1),
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

    const [
      { data: pkg, error: pkgError },
      { data: counterparty, error: counterpartyError },
    ] = await Promise.all([
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

    if (counterpartyError || !counterparty) {
      throw new Error(counterpartyError?.message ?? "Counterparty not found");
    }

    const disclosureDecision = canCounterpartyReceivePackage({
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

    if (!disclosureDecision.allowed) {
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: disclosureDecision.reason,
          disclosureDecision,
        },
        { status: 403 },
      );
    }

    const shareMetadata = {
      packageType: pkg.package_type,
      audience: pkg.audience,
      packageStatusAtShare: pkg.status,
      sanitized: disclosureDecision.sanitized,
      maxAllowedPackageType: disclosureDecision.maxAllowedPackageType,
      disclosureReason: disclosureDecision.reason,
      counterpartyName: counterparty.counterparty_name,
      counterpartyType: counterparty.counterparty_type,
      safeShare: true,
    };

    const { data: shareEvent, error: shareError } = await supabase
      .from("deal_package_share_events")
      .insert({
        deal_id: id,
        package_id: packageId,
        share_channel: body.shareChannel,
        recipient_type: counterparty.counterparty_type,
        recipient_identifier: body.recipientIdentifier,
        share_status: "sent",
        notes: body.notes ?? null,
        metadata: shareMetadata,
      })
      .select("*")
      .single();

    if (shareError || !shareEvent) {
      throw new Error(shareError?.message ?? "Failed to create share event");
    }

    const { data: updatedPackage, error: packageUpdateError } = await supabase
      .from("deal_packages")
      .update({
        status: pkg.status === "archived" ? pkg.status : "shared",
        package_payload: mergeMetadata(pkg.package_payload, {
          lastSafeShareAt: new Date().toISOString(),
          lastSafeShareCounterpartyId: String(counterparty.id),
          lastSafeShareSanitized: disclosureDecision.sanitized,
        }),
      })
      .eq("id", packageId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (packageUpdateError || !updatedPackage) {
      throw new Error(
        packageUpdateError?.message ?? "Failed to update package after safe share",
      );
    }

void triggerDealAutoProgression({
  dealId: id,
  triggerSource: "safe_share",
});

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packageId,
        counterpartyId: body.counterpartyId,
        disclosureDecision,
        shareEvent,
        packageRecord: updatedPackage,
        shareMode: disclosureDecision.sanitized ? "sanitized" : "full",
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