import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import {
  PipelineValidationError,
  validateContractCloseInput,
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
    const input = validateContractCloseInput(body);
    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      console.error('pipeline close lookup failed', pipelineResult.error);
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

    if (pipelineResult.data.stage === 'won' || pipelineResult.data.stage === 'lost') {
      return NextResponse.json(
        { error: `Pipeline is already closed as ${pipelineResult.data.stage}.` },
        { status: 409 },
      );
    }

    const outcomeInsertResult = await supabase
      .from('contract_outcomes')
      .upsert(
        {
          pipeline_id: input.pipelineId,
          enrollment_attempt_id: input.enrollmentAttemptId ?? null,
          pricing_quote_id: input.pricingQuoteId ?? null,
          status: input.status,
          supplier_name: input.supplierName ?? pipelineResult.data.supplier_name ?? null,
          utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
          commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
          contract_rate: input.contractRate ?? null,
          contract_rate_unit: input.contractRateUnit ?? null,
          term_months: input.termMonths ?? null,
          estimated_monthly_savings: input.estimatedMonthlySavings ?? null,
          estimated_annual_savings: input.estimatedAnnualSavings ?? null,
          realized_commission: input.realizedCommission ?? null,
          closed_reason: input.closedReason ?? null,
          notes: input.notes ?? null,
          outcome_payload: input.outcomePayload ?? {},
          closed_at: new Date().toISOString(),
        },
        {
          onConflict: 'pipeline_id',
        },
      )
      .select('*')
      .single();

    if (outcomeInsertResult.error || !outcomeInsertResult.data) {
      console.error('contract outcome upsert failed', outcomeInsertResult.error);
      return NextResponse.json(
        { error: 'Failed to close pipeline.' },
        { status: 500 },
      );
    }

    const nextStage = input.status === 'won' ? 'won' : 'lost';
    const nowIso = new Date().toISOString();

    const pipelineUpdateResult = await supabase
      .from('deal_pipeline')
      .update({
        stage: nextStage,
        closed_at: nowIso,
        won_at: nextStage === 'won' ? nowIso : null,
        lost_at: nextStage === 'lost' ? nowIso : null,
        supplier_name: input.supplierName ?? pipelineResult.data.supplier_name ?? null,
        utility_name: input.utilityName ?? pipelineResult.data.utility_name ?? null,
        commodity: input.commodity ?? pipelineResult.data.commodity ?? null,
        notes: input.notes ?? pipelineResult.data.notes ?? null,
      })
      .eq('id', input.pipelineId)
      .select('*')
      .single();

    if (pipelineUpdateResult.error || !pipelineUpdateResult.data) {
      console.error('pipeline close update failed', pipelineUpdateResult.error);
      return NextResponse.json(
        { error: 'Contract outcome saved but pipeline update failed.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: input.pipelineId,
      kind: 'contract_closed',
      message: `Pipeline closed as ${nextStage}.`,
      payload: {
        contractOutcomeId: outcomeInsertResult.data.id,
        status: outcomeInsertResult.data.status,
        realizedCommission: outcomeInsertResult.data.realized_commission,
        closedReason: outcomeInsertResult.data.closed_reason,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: pipelineUpdateResult.data,
        contractOutcome: outcomeInsertResult.data,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PipelineValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('pipeline close route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}