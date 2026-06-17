import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type RequestBody = {
  communicationId?: string;
  status?: string;
};

type PipelineCommunicationUpdate =
  Database['public']['Tables']['pipeline_communications']['Update'];

const ALLOWED_STATUSES = ['draft', 'ready', 'sent', 'failed', 'archived'] as const;

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

function assertStatus(value: string | null | undefined) {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    throw new Error('status is required.');
  }

  if ((ALLOWED_STATUSES as readonly string[]).includes(normalized) === false) {
    throw new Error('Invalid communication status.');
  }

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const communicationId = normalizeNullableString(body.communicationId);

    if (!communicationId) {
      return badRequest('communicationId is required.');
    }

    const nextStatus = assertStatus(body.status);

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
      status: nextStatus,
      sent_at:
        nextStatus === 'sent' && !existingResult.data.sent_at
          ? new Date().toISOString()
          : existingResult.data.sent_at,
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
    console.error('POST /api/pipeline/communication/status failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while updating communication status.',
      },
      { status: 500 },
    );
  }
}