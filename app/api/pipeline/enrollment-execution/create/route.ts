import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { EnrollmentExecutionCreateInput } from '@/lib/pipeline/execution';
import {
  assertEnrollmentExecutionStatus,
  assertExecutionSendMethod,
  normalizeExecutionPayload,
  normalizeNullableString,
  normalizeNullableTimestamp,
} from '@/lib/pipeline/executionValidation';
import { appendEnrollmentExecutionCreatedActivity } from '@/lib/pipeline/executionActivity';
import { requireApiRole } from '@/lib/auth/require-api-role';

type EnrollmentExecutionInsert =
  Database['public']['Tables']['enrollment_executions']['Insert'];

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
    const body = (await request.json()) as EnrollmentExecutionCreateInput;

    const pipelineId = normalizeNullableString(body.pipelineId);
    const enrollmentAttemptId = normalizeNullableString(body.enrollmentAttemptId);

    if (!pipelineId) {
      return badRequest('pipelineId is required.');
    }

    if (!enrollmentAttemptId) {
      return badRequest('enrollmentAttemptId is required.');
    }

    const executionStatus = assertEnrollmentExecutionStatus(body.executionStatus);
const sendMethod = assertExecutionSendMethod(body.sendMethod);
const recipientEmail = normalizeNullableString(body.recipientEmail);

    const insertPayload: EnrollmentExecutionInsert = {
      pipeline_id: pipelineId,
      enrollment_attempt_id: enrollmentAttemptId,
      execution_status: executionStatus,
      send_method: sendMethod,
      recipient_name: normalizeNullableString(body.recipientName),
      recipient_email: recipientEmail,
      recipient_company: normalizeNullableString(body.recipientCompany),
      external_reference: normalizeNullableString(body.externalReference),
      submitted_at: normalizeNullableTimestamp(body.submittedAt),
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

    const enrollmentAttemptResult = await supabase
      .from('enrollment_attempts')
      .select('id, pipeline_id')
      .eq('id', enrollmentAttemptId)
      .maybeSingle();

    if (enrollmentAttemptResult.error) {
      return NextResponse.json({ error: enrollmentAttemptResult.error.message }, { status: 500 });
    }

    if (!enrollmentAttemptResult.data || enrollmentAttemptResult.data.pipeline_id !== pipelineId) {
      return badRequest('enrollmentAttemptId does not belong to the provided pipeline.');
    }

    const insertResult = await supabase
      .from('enrollment_executions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    const updatedMetadata = appendEnrollmentExecutionCreatedActivity(
      pipelineResult.data.metadata,
      {
        executionId: insertResult.data.id,
        enrollmentAttemptId,
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
    console.error('POST /api/pipeline/enrollment-execution/create failed', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error while creating enrollment execution.' },
      { status: 500 },
    );
  }
}