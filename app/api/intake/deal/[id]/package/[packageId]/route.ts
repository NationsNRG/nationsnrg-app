// app/api/intake/deal/[id]/package/[packageId]/route.ts

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
  action: z.enum(["approve", "share", "archive", "supersede"]),
});

export async function PATCH(
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

    const { data: existingPackage, error: existingError } = await supabase
      .from("deal_packages")
      .select("*")
      .eq("id", packageId)
      .eq("deal_id", id)
      .single();

    if (existingError || !existingPackage) {
      throw new Error(existingError?.message ?? "Package not found");
    }

    if (body.action === "approve") {
      const { data, error } = await supabase
        .from("deal_packages")
        .update({
          status: "approved",
          approved_by: "operator_action",
          approved_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to approve package");
      }

      return NextResponse.json(
        {
          ok: true,
          packageRecord: data,
        },
        { status: 200 },
      );
    }

    if (body.action === "share") {
      const { data, error } = await supabase
        .from("deal_packages")
        .update({
          status: "shared",
        })
        .eq("id", packageId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to mark package as shared");
      }

      return NextResponse.json(
        {
          ok: true,
          packageRecord: data,
        },
        { status: 200 },
      );
    }

    if (body.action === "archive") {
      const { data, error } = await supabase
        .from("deal_packages")
        .update({
          status: "archived",
        })
        .eq("id", packageId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to archive package");
      }

      return NextResponse.json(
        {
          ok: true,
          packageRecord: data,
        },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from("deal_packages")
      .update({
        status: "superseded",
        superseded_at: new Date().toISOString(),
      })
      .eq("id", packageId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to supersede package");
    }

    return NextResponse.json(
      {
        ok: true,
        packageRecord: data,
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