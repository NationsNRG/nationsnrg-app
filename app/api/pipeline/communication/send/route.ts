import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type RequestBody = {
  communicationId?: string;
  subject?: string | null;
  body?: string | null;
  markAsSent?: boolean;
};

type PipelineCommunicationUpdate =
  Database['public']['Tables']['pipeline_communications']['Update'];

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const communicationId = normalizeNullableString(body.communicationId);

    if (!communicationId) {
      return badRequest('communicationId is required.');
    }

    const subjectOverride = normalizeNullableString(body.subject);
    const bodyOverride = normalizeNullableString(body.body);
    const markAsSent = body.markAsSent === true;

    const supabase = getSupabase();

    const existingResult = await supabase
      .from('pipeline_communications')
      .select('*')
      .eq('id', communicationId)
      .maybeSingle();

    if (existingResult.error) {
      return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
    }

    if (!existingResult.data) {
      return badRequest('Communication not found.');
    }

    const updatePayload: PipelineCommunicationUpdate = {
      subject: subjectOverride ?? existingResult.data.subject,
      body: bodyOverride ?? existingResult.data.body,
      status: markAsSent ? 'sent' : 'ready',
      sent_at: markAsSent ? new Date().toISOString() : existingResult.data.sent_at,
    };

    const updateResult = await supabase
      .from('pipeline_communications')
      .update(updatePayload)
      .eq('id', communicationId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      communication: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/pipeline/communication/send failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while sending communication.',
      },
      { status: 500 },
    );
  }
}