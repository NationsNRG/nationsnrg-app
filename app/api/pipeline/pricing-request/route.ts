import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PricingRequestInsert } from '@/lib/pipeline/types';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import {
  PipelineValidationError,
  validatePipelineStageTransition,
  validatePricingRequestCreateInput,
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
    const input = validatePricingRequestCreateInput(body);
    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      console.error('pricing request pipeline lookup failed', pipelineResult.error);
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

    validatePipelineStageTransition(pipelineResult.data.stage, 'pricing_requested');

    const pricingRequestInsert: PricingRequestInsert = {
      pipeline_id: input.pipelineId,
      request_source: input.requestSource ?? 'manual',
      supplier_name: input.supplierName ?? pipelineResult.data.supplier_name ?? null,
      utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
      commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
      requested_load_zone: input.requestedLoadZone ?? null,
      requested_term_months: input.requestedTermMonths ?? null,
      requested_usage: input.requestedUsage ?? null,
      request_payload: input.requestPayload ?? {},
      status: input.status,
      submitted_at:
        input.status === 'submitted' || input.status === 'completed'
          ? new Date().toISOString()
          : null,
      completed_at: input.status === 'completed' ? new Date().toISOString() : null,
    };

    const insertResult = await supabase
      .from('pricing_requests')
      .insert(pricingRequestInsert)
      .select('*')
      .single();

    if (insertResult.error || !insertResult.data) {
      console.error('pricing request insert failed', insertResult.error);
      return NextResponse.json(
        { error: 'Failed to create pricing request.' },
        { status: 500 },
      );
    }

    const updatePipelineResult = await supabase
      .from('deal_pipeline')
      .update({
        stage: 'pricing_requested',
        supplier_name: input.supplierName ?? pipelineResult.data.supplier_name ?? null,
        utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
        commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
      })
      .eq('id', input.pipelineId)
      .select('*')
      .single();

    if (updatePipelineResult.error || !updatePipelineResult.data) {
      console.error('pricing request pipeline update failed', updatePipelineResult.error);
      return NextResponse.json(
        { error: 'Pricing request created but pipeline update failed.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: input.pipelineId,
      kind: 'pricing_request_created',
      message: 'Pricing request created and pipeline moved to pricing_requested.',
      payload: {
        pricingRequestId: insertResult.data.id,
        supplierName: insertResult.data.supplier_name,
        utilityName: insertResult.data.utility_name,
        commodity: insertResult.data.commodity,
        requestedTermMonths: insertResult.data.requested_term_months,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: updatePipelineResult.data,
        pricingRequest: insertResult.data,
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

    console.error('pricing request route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}