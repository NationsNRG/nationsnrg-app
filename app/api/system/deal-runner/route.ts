// app/api/system/deal-runner/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_DEALS_PER_RUN = 25;

function isAuthorized(request: Request): boolean {
  const expected = process.env.DEAL_RUNNER_SECRET;
  if (!expected) return false;

  const headerSecret = request.headers.get("x-deal-runner-secret");

  const authHeader = request.headers.get("authorization");

  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : null;

  const cronSecret = request.headers.get("x-vercel-cron");

  if (cronSecret && process.env.VERCEL === "1") {
    return true;
  }

  return headerSecret === expected || bearerSecret === expected;
}

async function runDealRunner(request: Request): Promise<NextResponse> {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized deal runner request.",
        },
        { status: 401 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.DEAL_RUNNER_SECRET;

    if (!secret) {
      throw new Error("Missing DEAL_RUNNER_SECRET.");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: deals, error } = await supabase
      .from("deals")
      .select("id,status,created_at")
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: true })
      .limit(MAX_DEALS_PER_RUN);

    if (error) {
      throw new Error(error.message);
    }

    const dealRows = Array.isArray(deals) ? deals : [];

    const results = [];

    for (const deal of dealRows) {
      try {
        const response = await fetch(
          `${appUrl}/api/intake/deal/${String(deal.id)}/auto-progress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-deal-runner-secret": secret,
            },
            body: JSON.stringify({
              triggerSource: "system",
            }),
            cache: "no-store",
          },
        );

        const result = await response.json();

        results.push({
          dealId: deal.id,
          ok: response.ok && result.ok === true,
          result,
        });
      } catch (err) {
        results.push({
          dealId: deal.id,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

const successCount = results.filter((result) => result.ok).length;
const failureCount = results.length - successCount;

const runStatus =
  failureCount === 0
    ? "completed"
    : successCount > 0
      ? "partial_failure"
      : "failed";

await supabase.from("deal_runner_events").insert({
  run_mode: request.method,
  processed_count: results.length,
  success_count: successCount,
  failure_count: failureCount,
  run_status: runStatus,
  metadata: {
    results,
  },
});

return NextResponse.json({
  ok: true,
  mode: request.method,
  processed: results.length,
  successCount,
  failureCount,
  runStatus,
  results,
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

export async function POST(request: Request): Promise<NextResponse> {
  return runDealRunner(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return runDealRunner(request);
}