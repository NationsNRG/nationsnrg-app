import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import type { NormalizedPricingResponse } from '@/lib/integrations/types';

type RequestBody = {
  supplierInboundRequestId?: string;
  supplierAccessToken?: string;
  response?: NormalizedPricingResponse;
  selected?: boolean;
};

type SupplierInboundRequestUpdate =
  Database['public']['Tables']['supplier_inbound_requests']['Update'];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase env not configured');
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractStringField(value: Json | null | undefined, key: string): string | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const field = value[key];
  return typeof field === 'string' ? normalizeNullableString(field) : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const supplierInboundRequestId = normalizeNullableString(body.supplierInboundRequestId);

    const supplierAccessToken = normalizeNullableString(body.supplierAccessToken);

    if (!supplierInboundRequestId) {
      return badRequest('supplierInboundRequestId required');
    }

    if (!supplierAccessToken) {
      return badRequest('supplierAccessToken required');
    }

    if (!body.response) {
      return badRequest('response required');
    }

    const supabase = getSupabase();

    const inboundRes = await supabase
      .from('supplier_inbound_requests')
      .select('*')
      .eq('id', supplierInboundRequestId)
      .maybeSingle();

    if (inboundRes.error) {
      return NextResponse.json({ error: inboundRes.error.message }, { status: 500 });
    }

    if (!inboundRes.data) {
      return badRequest('Supplier inbound request not found');
    }

    const payload = inboundRes.data.payload;
    const storedSupplierAccessToken = extractStringField(payload, 'supplierAccessToken');

    if (storedSupplierAccessToken !== supplierAccessToken) {
      return NextResponse.json(
        { error: 'Unauthorized supplier response.' },
        { status: 401 },
      );
    }

    const pipelineId = extractStringField(payload, 'pipelineId');
    const pricingRequestId = extractStringField(payload, 'pricingRequestId');
    const pricingExecutionId = extractStringField(payload, 'pricingExecutionId');

    if (!pipelineId || !pricingRequestId) {
      return badRequest('Supplier inbound request is missing pipeline pricing linkage');
    }

    const ingestRes = await fetch(
      new URL('/api/integrations/pricing/result', req.url).toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          pricingRequestId,
          pricingExecutionId,
          selected: body.selected === true,
          response: body.response,
        }),
      },
    );

    const ingestData = (await ingestRes.json()) as { error?: string };

    if (!ingestRes.ok) {
      return NextResponse.json(
        { error: ingestData.error ?? 'Failed to ingest pricing response' },
        { status: ingestRes.status },
      );
    }

    const updatePayload: SupplierInboundRequestUpdate = {
      request_status: 'responded',
      payload: isJsonObject(payload)
        ? {
            ...payload,
            supplierResponse: body.response,
            respondedAt: new Date().toISOString(),
          }
        : {
            supplierResponse: body.response,
            respondedAt: new Date().toISOString(),
          },
    };

    const updateRes = await supabase
      .from('supplier_inbound_requests')
      .update(updatePayload)
      .eq('id', supplierInboundRequestId);

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Supplier pricing response processed successfully.',
      result: ingestData,
    });
  } catch (error) {
    console.error('suppliers/respond/pricing error', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}