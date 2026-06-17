import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { assertDocumentType } from '@/lib/commodity/validation';

type CommodityDocumentInsert =
  Database['public']['Tables']['commodity_documents']['Insert'];

type RequestBody = {
  dealId?: string;
  documentType?: string;
  documentUrl?: string | null;
  uploadedBy?: string | null;
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

    const dealId = normalizeNullableString(body.dealId);
    const documentTypeRaw = normalizeNullableString(body.documentType);

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required.' }, { status: 400 });
    }

    if (!documentTypeRaw) {
      return NextResponse.json({ error: 'documentType is required.' }, { status: 400 });
    }

    const documentType = assertDocumentType(documentTypeRaw);

    const insertPayload: CommodityDocumentInsert = {
      deal_id: dealId,
      document_type: documentType,
      document_url: normalizeNullableString(body.documentUrl),
      uploaded_by: normalizeNullableString(body.uploadedBy),
      verified: false,
      notes: normalizeNullableString(body.notes),
    };

    const supabase = getSupabase();

    const insertResult = await supabase
      .from('commodity_documents')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      document: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/documents/create failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while creating commodity document.',
      },
      { status: 500 },
    );
  }
}