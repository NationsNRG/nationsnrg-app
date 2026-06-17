import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PricingExecutionCreateInput } from '@/lib/pipeline/execution';
import {
  assertExecutionSendMethod,
  assertPricingExecutionStatus,
  normalizeExecutionPayload,
  normalizeNullableString,
  normalizeNullableTimestamp,
} from '@/lib/pipeline/executionValidation';
import { appendPricingExecutionCreatedActivity } from '@/lib/pipeline/executionActivity';

type PricingRequestExecutionInsert =
  Database['public']['Tables']['pricing_request_executions']['Insert'];

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
  try {
    const body = (await request.json()) as PricingExecutionCreateInput;

    const pipelineId = normalizeNullableString(body.pipelineId);
    const pricingRequestId = normalizeNullableString(body.pricingRequestId);

    if (!pipelineId) {
      return badRequest('pipelineId is required.');
    }

    if (!pricingRequestId) {
      return badRequest('pricingRequestId is required.');
    }

    const executionStatus = assertPricingExecutionStatus(body.executionStatus);
const sendMethod = assertExecutionSendMethod(body.sendMethod);
const recipientEmail = normalizeNullableString(body.recipientEmail);

    const insertPayload: PricingRequestExecutionInsert = {
      pipeline_id: pipelineId,
      pricing_request_id: pricingRequestId,
      execution_status: executionStatus,
      send_method: sendMethod,
      recipient_name: normalizeNullableString(body.recipientName),
      recipient_email: recipientEmail,
      recipient_company: normalizeNullableString(body.recipientCompany),
      external_reference: normalizeNullableString(body.externalReference),
      sent_at: normalizeNullableTimestamp(body.sentAt),
      response_due_at: normalizeNullableTimestamp(body.responseDueAt),
      operator_notes: normalizeNullableString(body.operatorNotes),
      execution_payload: normalizeExecutionPayload(body.executionPayload),
    };

    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('id, metadata')
      .eq('id', pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      return NextResponse.json({ error: pipelineResult.error.message }, { status: 500 });
    }

    if (!pipelineResult.data) {
      return badRequest('Pipeline not found.');
    }

    const pricingRequestResult = await supabase
      .from('pricing_requests')
      .select('id, pipeline_id')
      .eq('id', pricingRequestId)
      .maybeSingle();

    if (pricingRequestResult.error) {
      return NextResponse.json({ error: pricingRequestResult.error.message }, { status: 500 });
    }

    if (!pricingRequestResult.data || pricingRequestResult.data.pipeline_id !== pipelineId) {
      return badRequest('pricingRequestId does not belong to the provided pipeline.');
    }

    const insertResult = await supabase
      .from('pricing_request_executions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    const updatedMetadata = appendPricingExecutionCreatedActivity(
      pipelineResult.data.metadata,
      {
        executionId: insertResult.data.id,
        pricingRequestId,
        executionStatus,
        sendMethod,
        recipientEmail: recipientEmail,
      },
    );

    const pipelineUpdateResult = await supabase
      .from('deal_pipeline')
      .update({ metadata: updatedMetadata })
      .eq('id', pipelineId);

    if (pipelineUpdateResult.error) {
      return NextResponse.json({ error: pipelineUpdateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      execution: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/pipeline/pricing-execution/create failed', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error while creating pricing execution.' },
      { status: 500 },
    );
  }
}