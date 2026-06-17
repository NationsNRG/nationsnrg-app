import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { EnrollmentAttemptInsert } from '@/lib/pipeline/types';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import {
  PipelineValidationError,
  validateEnrollmentSubmitInput,
  validatePipelineStageTransition,
} from '@/lib/pipeline/validation';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateEnrollmentSubmitInput(body);
    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      console.error('enrollment submit pipeline lookup failed', pipelineResult.error);
      return NextResponse.json(
        { error: 'Failed to load pipeline.' },
        { status: 500 },
      );
    }

    if (!pipelineResult.data) {
      return NextResponse.json(
        { error: 'Pipeline not found.' },
        { status: 404 },
      );
    }

    validatePipelineStageTransition(pipelineResult.data.stage, 'enrollment_submitted');

    if (input.pricingQuoteId) {
      const quoteResult = await supabase
        .from('pricing_quotes')
        .select('*')
        .eq('id', input.pricingQuoteId)
        .eq('pipeline_id', input.pipelineId)
        .maybeSingle();

      if (quoteResult.error) {
        console.error('enrollment quote lookup failed', quoteResult.error);
        return NextResponse.json(
          { error: 'Failed to load pricing quote.' },
          { status: 500 },
        );
      }

      if (!quoteResult.data) {
        return NextResponse.json(
          { error: 'Pricing quote not found for pipeline.' },
          { status: 404 },
        );
      }

      const selectQuoteResult = await supabase
        .from('pricing_quotes')
        .update({
          status: 'selected',
          selected_at: new Date().toISOString(),
        })
        .eq('id', input.pricingQuoteId);

      if (selectQuoteResult.error) {
        console.error('enrollment quote select failed', selectQuoteResult.error);
        return NextResponse.json(
          { error: 'Failed to select pricing quote.' },
          { status: 500 },
        );
      }

      const deselectOthersResult = await supabase
        .from('pricing_quotes')
        .update({
          status: 'received',
          selected_at: null,
        })
        .eq('pipeline_id', input.pipelineId)
        .neq('id', input.pricingQuoteId)
        .eq('status', 'selected');

      if (deselectOthersResult.error) {
        console.error('enrollment quote deselect failed', deselectOthersResult.error);
        return NextResponse.json(
          { error: 'Failed to normalize quote selections.' },
          { status: 500 },
        );
      }
    }

    const enrollmentAttemptInsert: EnrollmentAttemptInsert = {
      pipeline_id: input.pipelineId,
      pricing_quote_id: input.pricingQuoteId ?? null,
      supplier_name: input.supplierName,
      enrollment_payload: input.enrollmentPayload ?? {},
      external_enrollment_id: input.externalEnrollmentId ?? null,
      status: input.status,
      submitted_at: new Date().toISOString(),
      resolved_at:
        input.status === 'accepted' ||
        input.status === 'rejected' ||
        input.status === 'failed'
          ? new Date().toISOString()
          : null,
      response_payload: input.responsePayload ?? {},
      failure_reason: input.failureReason ?? null,
    };

    const insertResult = await supabase
      .from('enrollment_attempts')
      .insert(enrollmentAttemptInsert)
      .select('*')
      .single();

    if (insertResult.error || !insertResult.data) {
      console.error('enrollment attempt insert failed', insertResult.error);
      return NextResponse.json(
        { error: 'Failed to create enrollment attempt.' },
        { status: 500 },
      );
    }

    const pipelineUpdateResult = await supabase
      .from('deal_pipeline')
      .update({
        stage: 'enrollment_submitted',
        supplier_name: input.supplierName,
      })
      .eq('id', input.pipelineId)
      .select('*')
      .single();

    if (pipelineUpdateResult.error || !pipelineUpdateResult.data) {
      console.error('enrollment pipeline update failed', pipelineUpdateResult.error);
      return NextResponse.json(
        { error: 'Enrollment attempt created but pipeline update failed.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: input.pipelineId,
      kind: 'enrollment_submitted',
      message: 'Enrollment submitted and pipeline moved to enrollment_submitted.',
      payload: {
        enrollmentAttemptId: insertResult.data.id,
        pricingQuoteId: insertResult.data.pricing_quote_id,
        supplierName: insertResult.data.supplier_name,
        status: insertResult.data.status,
        externalEnrollmentId: insertResult.data.external_enrollment_id,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: pipelineUpdateResult.data,
        enrollmentAttempt: insertResult.data,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PipelineValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('enrollment submit route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}