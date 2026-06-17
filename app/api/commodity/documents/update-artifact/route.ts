import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type CommodityDocumentUpdate =
  Database['public']['Tables']['commodity_documents']['Update'];

type RequestBody = {
  documentId?: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
  sourceType?: string | null;
  documentUrl?: string | null;
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

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const documentId = normalizeNullableString(body.documentId);

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required.' }, { status: 400 });
    }

    const updatePayload: CommodityDocumentUpdate = {
      file_name: normalizeNullableString(body.fileName),
      mime_type: normalizeNullableString(body.mimeType),
      file_size_bytes: normalizeNullableNumber(body.fileSizeBytes),
      checksum_sha256: normalizeNullableString(body.checksumSha256),
      source_type: normalizeNullableString(body.sourceType) ?? 'url',
      document_url: normalizeNullableString(body.documentUrl),
    };

    const supabase = getSupabase();

    const updateResult = await supabase
      .from('commodity_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      document: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/documents/update-artifact failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while updating document artifact.',
      },
      { status: 500 },
    );
  }
}