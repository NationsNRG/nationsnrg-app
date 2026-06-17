// app/api/intake/deal/[id]/package/share-analytics/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

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
      .from("deal_package_share_events")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const shareEvents = Array.isArray(data) ? data : [];

    const totals = {
      totalEvents: shareEvents.length,
      sentCount: shareEvents.filter((event) => event.share_status === "sent").length,
      deliveredCount: shareEvents.filter((event) => event.share_status === "delivered").length,
      openedCount: shareEvents.filter((event) => event.share_status === "opened").length,
      failedCount: shareEvents.filter((event) => event.share_status === "failed").length,
    };

    const byChannel = shareEvents.reduce<Record<string, number>>((acc, event) => {
      const key =
        typeof event.share_channel === "string" ? event.share_channel : "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const byRecipientType = shareEvents.reduce<Record<string, number>>((acc, event) => {
      const key =
        typeof event.recipient_type === "string" ? event.recipient_type : "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const latestEvent = shareEvents.length > 0 ? shareEvents[0] : null;

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        analytics: {
          totals,
          byChannel,
          byRecipientType,
          latestEvent,
        },
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