import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type CommodityDocumentUpdate =
  Database['public']['Tables']['commodity_documents']['Update'];

type CommodityVerificationLogInsert =
  Database['public']['Tables']['commodity_verification_logs']['Insert'];

type RequestBody = {
  documentId?: string;
  verified?: boolean;
  notes?: string | null;
};

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const documentId = normalizeNullableString(body.documentId);

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required.' }, { status: 400 });
    }

    if (typeof body.verified !== 'boolean') {
      return NextResponse.json({ error: 'verified must be boolean.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const documentResult = await supabase
      .from('commodity_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (documentResult.error) {
      return NextResponse.json({ error: documentResult.error.message }, { status: 500 });
    }

    if (!documentResult.data) {
      return NextResponse.json({ error: 'Commodity document not found.' }, { status: 404 });
    }

    const updatePayload: CommodityDocumentUpdate = {
      verified: body.verified,
      notes: normalizeNullableString(body.notes) ?? documentResult.data.notes,
    };

    const updateResult = await supabase
      .from('commodity_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    const logInsert: CommodityVerificationLogInsert = {
      deal_id: documentResult.data.deal_id,
      action: 'document_verification_update',
      result: body.verified ? 'verified' : 'unverified',
      notes: `Document ${documentResult.data.document_type} marked as ${
        body.verified ? 'verified' : 'unverified'
      }.`,
    };

    const logResult = await supabase
      .from('commodity_verification_logs')
      .insert(logInsert);

    if (logResult.error) {
      return NextResponse.json({ error: logResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      document: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/documents/verify failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while updating document verification.',
      },
      { status: 500 },
    );
  }
}