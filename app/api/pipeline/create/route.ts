import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import { validatePipelineCreateInput, PipelineValidationError } from '@/lib/pipeline/validation';

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
    const input = validatePipelineCreateInput(body);
    const supabase = getSupabase();

    const insertResult = await supabase
      .from('deal_pipeline')
      .insert({
        lead_id: input.leadId ?? null,
        proposal_id: input.proposalId ?? null,
        autonomous_deal_id: input.autonomousDealId ?? null,
        supplier_name: input.supplierName ?? null,
        utility_name: input.utilityName ?? null,
        commodity: input.commodity ?? null,
        service_address: input.serviceAddress ?? null,
        account_number: input.accountNumber ?? null,
        annual_usage_kwh: input.annualUsageKwh ?? null,
        annual_usage_therms: input.annualUsageTherms ?? null,
        deal_name: input.dealName,
        customer_name: input.customerName ?? null,
        customer_email: input.customerEmail ?? null,
        customer_phone: input.customerPhone ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
        stage: 'lead',
      })
      .select('*')
      .single();

    if (insertResult.error || !insertResult.data) {
      console.error('pipeline create insert failed', insertResult.error);
      return NextResponse.json(
        { error: 'Failed to create pipeline.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: insertResult.data.id,
      kind: 'pipeline_created',
      message: `Pipeline created at stage ${insertResult.data.stage}.`,
      payload: {
        dealName: insertResult.data.deal_name,
        supplierName: insertResult.data.supplier_name,
        utilityName: insertResult.data.utility_name,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: insertResult.data,
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

    console.error('pipeline create route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}