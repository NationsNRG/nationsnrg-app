// app/api/system/deal-runner/manual/route.ts

import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.DEAL_RUNNER_SECRET;

    if (!secret) {
      throw new Error("Missing DEAL_RUNNER_SECRET.");
    }

    const response = await fetch(`${appUrl}/api/system/deal-runner`, {
      method: "POST",
      headers: {
        "x-deal-runner-secret": secret,
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
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