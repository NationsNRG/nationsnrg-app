import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { NormalizedEnrollmentResponse } from '@/lib/integrations/types';
import {
  buildEnrollmentResultSummary,
  buildEnrollmentUpdatesFromResult,
} from '@/lib/integrations/enrollmentResult';

type RequestBody = {
  pipelineId?: string;
  enrollmentAttemptId?: string;
  enrollmentExecutionId?: string | null;
  response?: NormalizedEnrollmentResponse;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase env not configured');
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const pipelineId = normalizeNullableString(body.pipelineId);
    const enrollmentAttemptId = normalizeNullableString(body.enrollmentAttemptId);
    const enrollmentExecutionId = normalizeNullableString(body.enrollmentExecutionId);

    if (!pipelineId) {
      return badRequest('pipelineId required');
    }

    if (!enrollmentAttemptId) {
      return badRequest('enrollmentAttemptId required');
    }

    if (!body.response) {
      return badRequest('response required');
    }

    const supabase = getSupabase();

    const [pipelineRes, enrollmentAttemptRes] = await Promise.all([
      supabase
        .from('deal_pipeline')
        .select('id, stage')
        .eq('id', pipelineId)
        .maybeSingle(),
      supabase
        .from('enrollment_attempts')
        .select('*')
        .eq('id', enrollmentAttemptId)
        .maybeSingle(),
    ]);

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (enrollmentAttemptRes.error) {
      return NextResponse.json({ error: enrollmentAttemptRes.error.message }, { status: 500 });
    }

    if (!pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (!enrollmentAttemptRes.data || enrollmentAttemptRes.data.pipeline_id !== pipelineId) {
      return badRequest('Invalid enrollmentAttemptId');
    }

    const ingestionRecord = buildEnrollmentUpdatesFromResult({
      pipelineId,
      enrollmentAttempt: enrollmentAttemptRes.data,
      response: body.response,
    });

    const updateAttemptRes = await supabase
      .from('enrollment_attempts')
      .update(ingestionRecord.enrollmentAttemptUpdate)
      .eq('id', enrollmentAttemptId)
      .eq('pipeline_id', pipelineId)
      .select('*')
      .single();

    if (updateAttemptRes.error) {
      return NextResponse.json({ error: updateAttemptRes.error.message }, { status: 500 });
    }

    if (enrollmentExecutionId) {
      const updateExecutionRes = await supabase
        .from('enrollment_executions')
        .update(ingestionRecord.enrollmentExecutionUpdate)
        .eq('id', enrollmentExecutionId)
        .eq('pipeline_id', pipelineId);

      if (updateExecutionRes.error) {
        return NextResponse.json({ error: updateExecutionRes.error.message }, { status: 500 });
      }
    }

    const normalizedStatus = body.response.normalizedStatus?.status ?? null;

    if (normalizedStatus === 'accepted') {
      const updatePipelineRes = await supabase
        .from('deal_pipeline')
        .update({
          stage: 'won',
        })
        .eq('id', pipelineId);

      if (updatePipelineRes.error) {
        return NextResponse.json({ error: updatePipelineRes.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      updatedEnrollmentAttempt: updateAttemptRes.data,
      summary: buildEnrollmentResultSummary(body.response),
      message: 'Enrollment result ingested successfully.',
    });
  } catch (err) {
    console.error('enrollment/result error', err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}