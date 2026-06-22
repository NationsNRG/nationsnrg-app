import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PricingExecutionStatusUpdateInput } from '@/lib/pipeline/execution';
import {
  assertPricingExecutionStatus,
  assertPricingExecutionTransition,
  normalizeExecutionPayload,
  normalizeNullableString,
  normalizeNullableTimestamp,
} from '@/lib/pipeline/executionValidation';
import { appendPricingExecutionStatusChangedActivity } from '@/lib/pipeline/executionActivity';
import { requireApiRole } from '@/lib/auth/require-api-role';

type PricingRequestExecutionUpdate =
  Database['public']['Tables']['pricing_request_executions']['Update'];

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(
    request,
    ['admin', 'operator'],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as PricingExecutionStatusUpdateInput;
    const executionId = normalizeNullableString(body.executionId);

    if (!executionId) {
      return badRequest('executionId is required.');
    }

    const nextStatus = assertPricingExecutionStatus(body.executionStatus);

    const supabase = getSupabase();

    const executionResult = await supabase
      .from('pricing_request_executions')
      .select('*')
      .eq('id', executionId)
      .maybeSingle();

    if (executionResult.error) {
      return NextResponse.json({ error: executionResult.error.message }, { status: 500 });
    }

    if (!executionResult.data) {
      return badRequest('Pricing execution not found.');
    }

    const previousStatus = assertPricingExecutionStatus(
        executionResult.data.execution_status,
    );

    assertPricingExecutionTransition(previousStatus, nextStatus);

    const updatePayload: PricingRequestExecutionUpdate = {
      execution_status: nextStatus,
      external_reference: normalizeNullableString(body.externalReference),
      response_received_at: normalizeNullableTimestamp(body.responseReceivedAt),
      operator_notes: normalizeNullableString(body.operatorNotes),
      execution_payload: normalizeExecutionPayload(body.executionPayload),
    };

    const updateResult = await supabase
      .from('pricing_request_executions')
      .update(updatePayload)
      .eq('id', executionId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('id, metadata')
      .eq('id', executionResult.data.pipeline_id)
      .maybeSingle();

    if (pipelineResult.error) {
      return NextResponse.json({ error: pipelineResult.error.message }, { status: 500 });
    }

    if (!pipelineResult.data) {
      return badRequest('Pipeline not found.');
    }

    const updatedMetadata = appendPricingExecutionStatusChangedActivity(
      pipelineResult.data.metadata,
      {
        executionId,
        previousStatus,
        nextStatus,
        externalReference: updatePayload.external_reference ?? null,
      },
    );

    const pipelineUpdateResult = await supabase
      .from('deal_pipeline')
      .update({ metadata: updatedMetadata })
      .eq('id', executionResult.data.pipeline_id);

    if (pipelineUpdateResult.error) {
      return NextResponse.json({ error: pipelineUpdateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      execution: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/pipeline/pricing-execution/status failed', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error while updating pricing execution status.' },
      { status: 500 },
    );
  }
}