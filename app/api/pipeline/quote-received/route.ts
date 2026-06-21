import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PricingQuoteInsert } from '@/lib/pipeline/types';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import {
  PipelineValidationError,
  validatePipelineStageTransition,
  validateQuoteReceivedInput,
} from '@/lib/pipeline/validation';
import { requireApiRole } from '@/lib/auth/require-api-role';

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
  const auth = await requireApiRole(
    request,
    ['admin', 'operator'],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const input = validateQuoteReceivedInput(body);
    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      console.error('quote received pipeline lookup failed', pipelineResult.error);
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

    validatePipelineStageTransition(pipelineResult.data.stage, 'quoted');

    const requestResult = await supabase
      .from('pricing_requests')
      .select('*')
      .eq('id', input.pricingRequestId)
      .eq('pipeline_id', input.pipelineId)
      .maybeSingle();

    if (requestResult.error) {
      console.error('quote received pricing request lookup failed', requestResult.error);
      return NextResponse.json(
        { error: 'Failed to load pricing request.' },
        { status: 500 },
      );
    }

    if (!requestResult.data) {
      return NextResponse.json(
        { error: 'Pricing request not found for pipeline.' },
        { status: 404 },
      );
    }

    const pricingQuoteInsert: PricingQuoteInsert = {
      pipeline_id: input.pipelineId,
      pricing_request_id: input.pricingRequestId,
      supplier_name: input.supplierName,
      utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
      commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
      rate: input.rate ?? null,
      rate_unit: input.rateUnit ?? null,
      term_months: input.termMonths ?? null,
      estimated_monthly_savings: input.estimatedMonthlySavings ?? null,
      estimated_annual_savings: input.estimatedAnnualSavings ?? null,
      commission_estimate: input.commissionEstimate ?? null,
      valid_until: input.validUntil ?? null,
      quote_payload: input.quotePayload ?? {},
      status: input.selectForPipeline ? 'selected' : 'received',
      selected_at: input.selectForPipeline ? new Date().toISOString() : null,
    };

    const quoteInsertResult = await supabase
      .from('pricing_quotes')
      .insert(pricingQuoteInsert)
      .select('*')
      .single();

    if (quoteInsertResult.error || !quoteInsertResult.data) {
      console.error('quote received insert failed', quoteInsertResult.error);
      return NextResponse.json(
        { error: 'Failed to save quote.' },
        { status: 500 },
      );
    }

    const requestUpdateResult = await supabase
      .from('pricing_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', input.pricingRequestId);

    if (requestUpdateResult.error) {
      console.error('pricing request completion update failed', requestUpdateResult.error);
      return NextResponse.json(
        { error: 'Quote saved but pricing request update failed.' },
        { status: 500 },
      );
    }

    if (input.selectForPipeline) {
      const deselectOtherQuotesResult = await supabase
        .from('pricing_quotes')
        .update({
          status: 'received',
          selected_at: null,
        })
        .eq('pipeline_id', input.pipelineId)
        .neq('id', quoteInsertResult.data.id)
        .eq('status', 'selected');

      if (deselectOtherQuotesResult.error) {
        console.error('quote deselection failed', deselectOtherQuotesResult.error);
        return NextResponse.json(
          { error: 'Quote saved but previous selected quote cleanup failed.' },
          { status: 500 },
        );
      }
    }

    const pipelineUpdateResult = await supabase
      .from('deal_pipeline')
      .update({
        stage: 'quoted',
        supplier_name: input.supplierName,
        utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
        commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
      })
      .eq('id', input.pipelineId)
      .select('*')
      .single();

    if (pipelineUpdateResult.error || !pipelineUpdateResult.data) {
      console.error('quote received pipeline update failed', pipelineUpdateResult.error);
      return NextResponse.json(
        { error: 'Quote saved but pipeline update failed.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: input.pipelineId,
      kind: input.selectForPipeline ? 'quote_selected' : 'quote_received',
      message: input.selectForPipeline
        ? 'Quote received, selected, and pipeline moved to quoted.'
        : 'Quote received and pipeline moved to quoted.',
      payload: {
        pricingQuoteId: quoteInsertResult.data.id,
        pricingRequestId: input.pricingRequestId,
        supplierName: quoteInsertResult.data.supplier_name,
        rate: quoteInsertResult.data.rate,
        termMonths: quoteInsertResult.data.term_months,
        validUntil: quoteInsertResult.data.valid_until,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: pipelineUpdateResult.data,
        pricingQuote: quoteInsertResult.data,
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

    console.error('quote received route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}