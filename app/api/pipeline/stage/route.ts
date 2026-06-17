import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logPipelineActivity } from '@/lib/pipeline/activity';
import {
  PipelineValidationError,
  validatePipelineStageInput,
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
    const input = validatePipelineStageInput(body);
    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      console.error('pipeline stage lookup failed', pipelineResult.error);
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

    validatePipelineStageTransition(pipelineResult.data.stage, input.stage);

    const nowIso = new Date().toISOString();

    const updateResult = await supabase
      .from('deal_pipeline')
      .update({
        stage: input.stage,
        notes: input.notes ?? pipelineResult.data.notes ?? null,
        closed_at:
          input.stage === 'won' || input.stage === 'lost'
            ? nowIso
            : pipelineResult.data.closed_at,
        won_at: input.stage === 'won' ? nowIso : pipelineResult.data.won_at,
        lost_at: input.stage === 'lost' ? nowIso : pipelineResult.data.lost_at,
      })
      .eq('id', input.pipelineId)
      .select('*')
      .single();

    if (updateResult.error || !updateResult.data) {
      console.error('pipeline stage update failed', updateResult.error);
      return NextResponse.json(
        { error: 'Failed to update pipeline stage.' },
        { status: 500 },
      );
    }

    await logPipelineActivity({
      pipelineId: input.pipelineId,
      kind: 'pipeline_stage_changed',
      message: `Pipeline stage changed from ${pipelineResult.data.stage} to ${input.stage}.`,
      payload: {
        previousStage: pipelineResult.data.stage,
        nextStage: input.stage,
        notes: input.notes ?? null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        pipeline: updateResult.data,
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

    console.error('pipeline stage route failed', error);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 },
    );
  }
}