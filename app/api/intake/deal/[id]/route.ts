// app/api/intake/deal/[id]/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;

    const supabase = getServiceClient();

    const [
      { data: deal, error: dealError },
      { data: demandEstimate, error: demandError },
      { data: queues, error: queuesError },
      { data: tasks, error: tasksError },
      { data: blockers, error: blockersError },
      { data: nextBestActions, error: nbaError },
      { data: economicStack, error: economicError },
      { data: supplierSequences, error: supplierError },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("deal_demand_estimates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("deal_action_queues")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("deal_operator_tasks")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: true }),

      supabase
        .from("deal_blocker_states")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: true }),

      supabase
        .from("deal_next_best_actions")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),

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
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }

    if (demandError) {
      throw new Error(demandError.message);
    }

    if (queuesError) {
      throw new Error(queuesError.message);
    }

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    if (blockersError) {
      throw new Error(blockersError.message);
    }

    if (nbaError) {
      throw new Error(nbaError.message);
    }

    if (economicError) {
      throw new Error(economicError.message);
    }

    if (supplierError) {
      throw new Error(supplierError.message);
    }

    return ok({
      deal,
      demandEstimate: demandEstimate ?? null,
      orchestration: {
        queues: queues ?? [],
        tasks: tasks ?? [],
        blockers: blockers ?? [],
        nextBestActions: nextBestActions ?? [],
      },
      economicStack: economicStack ?? null,
      supplierSequences: supplierSequences ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}