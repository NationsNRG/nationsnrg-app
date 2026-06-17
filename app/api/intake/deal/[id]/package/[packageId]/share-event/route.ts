// app/api/intake/deal/[id]/package/[packageId]/share-event/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
}

const requestSchema = z.object({
  shareChannel: z.enum(["email", "portal", "manual", "api", "other"]),
  recipientType: z.enum(["supplier", "epc", "lpl", "buyer", "internal"]),
  recipientIdentifier: z.string().trim().min(1),
  shareStatus: z
    .enum(["logged", "sent", "delivered", "opened", "failed"])
    .default("logged"),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, packageId } = await context.params;
    const body = requestSchema.parse(await request.json());

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Supabase server configuration.",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: pkg, error: pkgError } = await supabase
      .from("deal_packages")
      .select("id, deal_id, status, package_type, audience")
      .eq("id", packageId)
      .eq("deal_id", id)
      .maybeSingle();

    if (pkgError || !pkg) {
      return NextResponse.json(
        {
          ok: false,
          error: pkgError?.message ?? "Package not found.",
        },
        { status: 404 },
      );
    }

    const { data: shareEvents, error: shareError } = await supabase
      .from("deal_package_share_events")
      .insert({
        deal_id: id,
        package_id: packageId,
        share_channel: body.shareChannel,
        recipient_type: body.recipientType,
        recipient_identifier: body.recipientIdentifier,
        share_status: body.shareStatus,
        notes: body.notes ?? null,
        metadata: {
          packageType: pkg.package_type,
          audience: pkg.audience,
          packageStatusAtShare: pkg.status,
          ...body.metadata,
        },
      })
      .select("*");

    if (shareError || !shareEvents || shareEvents.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: shareError?.message ?? "Failed to log share event.",
        },
        { status: 400 },
      );
    }

    const shareEvent = shareEvents[0];

    const nextStatus = pkg.status === "archived" ? pkg.status : "shared";

    const { data: updatedPackages, error: updateError } = await supabase
      .from("deal_packages")
      .update({
        status: nextStatus,
      })
      .eq("id", packageId)
      .eq("deal_id", id)
      .select("*");

    if (updateError || !updatedPackages || updatedPackages.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: updateError?.message ?? "Failed to update package status.",
        },
        { status: 400 },
      );
    }

    const updatedPackage = updatedPackages[0];

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        packageId,
        shareEvent,
        packageRecord: updatedPackage,
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