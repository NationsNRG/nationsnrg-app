// app/api/intake/deal/[id]/autonomous-executor/run/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ExecutorResult {
  action: string;
  ok: boolean;
  status: number | null;
  response: unknown;
  error: string | null;
}

async function runInternalPost(params: {
  origin: string;
  path: string;
  body?: Record<string, unknown>;
}): Promise<ExecutorResult> {
  try {
    const response = await fetch(`${params.origin}${params.path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-autonomous-system": "true",
      },
      body: JSON.stringify(params.body ?? {}),
      cache: "no-store",
    });

    const json = (await response.json()) as unknown;

    return {
      action: params.path,
      ok: response.ok,
      status: response.status,
      response: json,
      error: response.ok ? null : JSON.stringify(json),
    };
  } catch (error) {
    return {
      action: params.path,
      ok: false,
      status: null,
      response: null,
      error: error instanceof Error ? error.message : "Unknown executor error",
    };
  }
}

function createRunFingerprint(params: {
  dealId: string;
  actions: string[];
}): string {
  const sortedActions = [...params.actions].sort().join("|");
  const minuteBucket = Math.floor(Date.now() / 60000);

  return `${params.dealId}:${minuteBucket}:${sortedActions}`;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const decisionResponse = await fetch(
      `${origin}/api/intake/deal/${id}/autonomous-decision/run`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-autonomous-system": "true",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      },
    );

    const decisionJson = (await decisionResponse.json()) as
      | {
          ok: true;
          result: {
            decisions: Array<{
              action: string;
              shouldRun: boolean;
              priority: number;
              reason: string;
            }>;
          };
        }
      | { ok: false; error?: string };

    if (!decisionResponse.ok || !decisionJson.ok) {
      throw new Error(
        decisionJson.ok === false
          ? decisionJson.error ?? "Failed to evaluate autonomous decisions."
          : "Failed to evaluate autonomous decisions.",
      );
    }

    const decisions = decisionJson.result.decisions.filter(
      (decision) => decision.shouldRun,
    );
    
    const runnableActions = decisions.map((decision) => decision.action);

    const runFingerprint = createRunFingerprint({
    dealId: id,
    actions: runnableActions,
    });

    const { data: existingRun, error: existingRunError } = await supabase
    .from("autonomous_executor_events")
    .select("id, created_at")
    .eq("deal_id", id)
    .eq("run_fingerprint", runFingerprint)
    .maybeSingle();

    if (existingRunError) {
    throw new Error(existingRunError.message);
    }

    if (existingRun) {
    return NextResponse.json({
        ok: true,
        dealId: id,
        skipped: true,
        reason: "Duplicate autonomous executor run suppressed.",
        existingRunId: existingRun.id,
        decisionsEvaluated: decisions.length,
        successfulActions: 0,
        failedActions: 0,
        executionResults: [],
    });
    }    

    const executionResults: ExecutorResult[] = [];

    for (const decision of decisions) {
      switch (decision.action) {
        case "refresh_readiness":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/contract-readiness`,
              body: { triggerSource: "system" },
            }),
          );
          break;

        case "refresh_compensation":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/compensation-protection`,
            }),
          );
          break;

        case "run_execution_gate":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/execution-checklist/run`,
            }),
          );
          break;

        case "run_epc_scoring":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/epc-recommendation/run`,
            }),
          );
          break;

        case "run_auto_progression":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/auto-progress`,
              body: { triggerSource: "system" },
            }),
          );
          break;

        case "run_payout_enforcement":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/payout-enforcement/run`,
            }),
          );
          break;

        case "generate_operator_brief":
          executionResults.push(
            await runInternalPost({
              origin,
              path: `/api/intake/deal/${id}/operator-brief/run`,
            }),
          );
          break;

        case "hold_deal": {
          const { error } = await supabase
            .from("deals")
            .update({ status: "on_hold" })
            .eq("id", id);

          executionResults.push({
            action: "hold_deal",
            ok: !error,
            status: error ? 400 : 200,
            response: error ? null : { status: "on_hold" },
            error: error?.message ?? null,
          });

          break;
        }

        case "no_action":
          executionResults.push({
            action: "no_action",
            ok: true,
            status: 200,
            response: { message: "No autonomous action required." },
            error: null,
          });
          break;

        default:
          executionResults.push({
            action: decision.action,
            ok: false,
            status: 400,
            response: null,
            error: "Unknown autonomous action.",
          });
      }
    }

    const successful = executionResults.filter((result) => result.ok).length;
    const failed = executionResults.filter((result) => !result.ok).length;

    await supabase.from("autonomous_executor_events").insert({
      deal_id: id,
      run_fingerprint: runFingerprint,
      decisions_evaluated: decisions.length,
      successful_actions: successful,
      failed_actions: failed,
      executor_status:
        failed === 0 ? "completed" : successful > 0 ? "partial_failure" : "failed",
      metadata: {
        executionResults,
        decisions,
      },
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      decisionsEvaluated: decisions.length,
      successfulActions: successful,
      failedActions: failed,
      executionResults,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown autonomous executor error",
      },
      { status: 400 },
    );
  }
}