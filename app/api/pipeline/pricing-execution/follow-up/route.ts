import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PricingExecutionFollowUpInput } from '@/lib/pipeline/execution';
import {
  normalizeNullableString,
  normalizeNullableTimestamp,
} from '@/lib/pipeline/executionValidation';
import { appendPricingExecutionFollowUpActivity } from '@/lib/pipeline/executionActivity';
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
    const body = (await request.json()) as PricingExecutionFollowUpInput;
    const executionId = normalizeNullableString(body.executionId);

    if (!executionId) {
      return badRequest('executionId is required.');
    }

    const followUpAt = normalizeNullableTimestamp(body.followUpAt) ?? new Date().toISOString();
    const operatorNotes = normalizeNullableString(body.operatorNotes);

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

    const updatePayload: PricingRequestExecutionUpdate = {
      last_follow_up_at: followUpAt,
      operator_notes: operatorNotes,
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

    const updatedMetadata = appendPricingExecutionFollowUpActivity(
      pipelineResult.data.metadata,
      {
        executionId,
        followUpAt,
        operatorNotes,
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
    console.error('POST /api/pipeline/pricing-execution/follow-up failed', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error while logging pricing execution follow-up.' },
      { status: 500 },
    );
  }
}