import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { generateProposal, proposalToJson } from '@/lib/pipeline/proposal';

type RequestBody = {
  pipelineId?: string;
  selectedMessage?: string | null;
};

type PipelineProposalInsert =
  Database['public']['Tables']['pipeline_proposals']['Insert'];

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
    const body = (await request.json()) as RequestBody;
    const pipelineId = body.pipelineId?.trim();

    if (!pipelineId) {
      return badRequest('pipelineId is required.');
    }

    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      return NextResponse.json(
        { error: pipelineResult.error.message },
        { status: 500 },
      );
    }

    if (!pipelineResult.data) {
      return badRequest('Pipeline not found.');
    }

    const selectedQuoteResult = await supabase
      .from('pricing_quotes')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('status', 'selected')
      .maybeSingle();

    if (selectedQuoteResult.error) {
      return NextResponse.json(
        { error: selectedQuoteResult.error.message },
        { status: 500 },
      );
    }

    if (!selectedQuoteResult.data) {
      return badRequest('No selected quote found for this pipeline.');
    }

    const proposal = generateProposal({
      pipeline: pipelineResult.data,
      selectedQuote: selectedQuoteResult.data,
    });

    const insertPayload: PipelineProposalInsert = {
      pipeline_id: pipelineId,
      pricing_quote_id: selectedQuoteResult.data.id,
      title: proposal.headline,
      proposal_payload: proposalToJson(proposal),
      selected_message: body.selectedMessage?.trim() || null,
    };

    const insertResult = await supabase
      .from('pipeline_proposals')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      proposal,
      record: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/pipeline/proposal failed', error);

    return NextResponse.json(
      { error: 'Unexpected error while generating proposal.' },
      { status: 500 },
    );
  }
}