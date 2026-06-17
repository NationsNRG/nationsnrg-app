import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  COMMUNICATION_TYPES,
  generateCommunication,
  type CommunicationType,
} from '@/lib/pipeline/communication';

type RequestBody = {
  pipelineId?: string;
  communicationType?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
};

type PipelineCommunicationInsert =
  Database['public']['Tables']['pipeline_communications']['Insert'];

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

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertCommunicationType(value: string | null | undefined): CommunicationType {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    throw new Error('communicationType is required.');
  }

  if ((COMMUNICATION_TYPES as readonly string[]).includes(normalized) === false) {
    throw new Error('Invalid communicationType.');
  }

  return normalized as CommunicationType;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const pipelineId = normalizeNullableString(body.pipelineId);

    if (!pipelineId) {
      return badRequest('pipelineId is required.');
    }

    const communicationType = assertCommunicationType(body.communicationType);
    const relatedEntityType = normalizeNullableString(body.relatedEntityType);
    const relatedEntityId = normalizeNullableString(body.relatedEntityId);
    const recipientName = normalizeNullableString(body.recipientName);
    const recipientEmail = normalizeNullableString(body.recipientEmail);

    const supabase = getSupabase();

    const pipelineResult = await supabase
      .from('deal_pipeline')
      .select('*')
      .eq('id', pipelineId)
      .maybeSingle();

    if (pipelineResult.error) {
      return NextResponse.json({ error: pipelineResult.error.message }, { status: 500 });
    }

    if (!pipelineResult.data) {
      return badRequest('Pipeline not found.');
    }

    const pricingRequestResult = await supabase
      .from('pricing_requests')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pricingRequestResult.error) {
      return NextResponse.json({ error: pricingRequestResult.error.message }, { status: 500 });
    }

    const selectedQuoteResult = await supabase
      .from('pricing_quotes')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('status', 'selected')
      .maybeSingle();

    if (selectedQuoteResult.error) {
      return NextResponse.json({ error: selectedQuoteResult.error.message }, { status: 500 });
    }

    const enrollmentAttemptResult = await supabase
      .from('enrollment_attempts')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollmentAttemptResult.error) {
      return NextResponse.json({ error: enrollmentAttemptResult.error.message }, { status: 500 });
    }

    const proposalResult = await supabase
      .from('pipeline_proposals')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (proposalResult.error) {
      return NextResponse.json({ error: proposalResult.error.message }, { status: 500 });
    }

    const rebuttalResult = await supabase
      .from('pipeline_objections')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rebuttalResult.error) {
      return NextResponse.json({ error: rebuttalResult.error.message }, { status: 500 });
    }

    const generated = generateCommunication({
      pipeline: pipelineResult.data,
      pricingRequest: pricingRequestResult.data ?? null,
      selectedQuote: selectedQuoteResult.data ?? null,
      enrollmentAttempt: enrollmentAttemptResult.data ?? null,
      proposalPayload: proposalResult.data?.proposal_payload ?? null,
      rebuttalPayload: rebuttalResult.data?.generated_rebuttals ?? null,
      communicationType,
    });

    const insertPayload: PipelineCommunicationInsert = {
      pipeline_id: pipelineId,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      communication_type: generated.communicationType,
      channel: generated.channel,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      subject: generated.subject,
      body: generated.body,
      status: 'draft',
      generated_from: generated.generatedFrom,
      metadata: generated.metadata,
    };

    const insertResult = await supabase
      .from('pipeline_communications')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      communication: insertResult.data,
      generated,
    });
  } catch (error) {
    console.error('POST /api/pipeline/communication/generate failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while generating communication.',
      },
      { status: 500 },
    );
  }
}