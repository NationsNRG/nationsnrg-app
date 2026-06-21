import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  generateRebuttals,
  normalizeCustomerTone,
  normalizeObjectionCategory,
  rebuttalsToJson,
} from '@/lib/pipeline/rebuttal';
import { requireApiRole } from '@/lib/auth/require-api-role';

type RequestBody = {
  pipelineId?: string;
  objectionText?: string;
  objectionCategory?: string | null;
  customerTone?: string | null;
  selectedRebuttal?: string | null;
};

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
    const body = (await request.json()) as RequestBody;
    const pipelineId = body.pipelineId?.trim();
    const objectionText = body.objectionText?.trim();

    if (!pipelineId) {
      return badRequest('pipelineId is required.');
    }

    if (!objectionText) {
      return badRequest('objectionText is required.');
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

    const generated = generateRebuttals({
      pipeline: pipelineResult.data,
      selectedQuote: selectedQuoteResult.data ?? null,
      objectionText,
      objectionCategory: normalizeObjectionCategory(body.objectionCategory),
      customerTone: normalizeCustomerTone(body.customerTone),
    });

    const insertResult = await supabase
      .from('pipeline_objections')
      .insert({
        pipeline_id: pipelineId,
        objection_text: generated.objection,
        objection_category: generated.category,
        customer_tone: generated.customerTone,
        generated_rebuttals: rebuttalsToJson(generated),
        selected_rebuttal: body.selectedRebuttal?.trim() || null,
      })
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      objection: generated.objection,
      category: generated.category,
      customerTone: generated.customerTone,
      rebuttals: generated.rebuttals,
      record: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/pipeline/rebuttal failed', error);

    return NextResponse.json(
      { error: 'Unexpected error while generating rebuttals.' },
      { status: 500 },
    );
  }
}