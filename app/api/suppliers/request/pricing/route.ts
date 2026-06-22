import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { requireApiRole } from '@/lib/auth/require-api-role';

type RequestBody = {
  supplierId?: string;
  pipelineId?: string | null;
  pricingRequestId?: string | null;
  pricingExecutionId?: string | null;
  notes?: string | null;
  payload?: Json;
};

type SupplierInboundRequestInsert =
  Database['public']['Tables']['supplier_inbound_requests']['Insert'];

type PricingExecutionUpdate =
  Database['public']['Tables']['pricing_request_executions']['Update'];

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

function mergeJson(
  existing: Json | null | undefined,
  addition: Record<string, Json | undefined>,
): Json {
  if (isJsonObject(existing)) {
    return {
      ...existing,
      ...addition,
    };
  }

  return addition;
}

export async function POST(req: Request) {
  const auth = await requireApiRole(
    req,
    ['admin', 'operator'],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await req.json()) as RequestBody;

    const supplierId = normalizeNullableString(body.supplierId);
    const pipelineId = normalizeNullableString(body.pipelineId);
    const pricingRequestId = normalizeNullableString(body.pricingRequestId);
    const pricingExecutionId = normalizeNullableString(body.pricingExecutionId);
    const notes = normalizeNullableString(body.notes);

    if (!supplierId) {
      return badRequest('supplierId required');
    }

    const supabase = getSupabase();

    const [supplierRes, pipelineRes, pricingRequestRes, pricingExecutionRes] = await Promise.all([
      supabase.from('suppliers').select('id, supplier_name').eq('id', supplierId).maybeSingle(),
      pipelineId
        ? supabase.from('deal_pipeline').select('id').eq('id', pipelineId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      pricingRequestId
        ? supabase.from('pricing_requests').select('*').eq('id', pricingRequestId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      pricingExecutionId
        ? supabase
            .from('pricing_request_executions')
            .select('*')
            .eq('id', pricingExecutionId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (supplierRes.error) {
      return NextResponse.json({ error: supplierRes.error.message }, { status: 500 });
    }

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (pricingRequestRes.error) {
      return NextResponse.json({ error: pricingRequestRes.error.message }, { status: 500 });
    }

    if (pricingExecutionRes.error) {
      return NextResponse.json({ error: pricingExecutionRes.error.message }, { status: 500 });
    }

    if (!supplierRes.data) {
      return badRequest('Supplier not found');
    }

    if (pipelineId && !pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (pricingRequestId && !pricingRequestRes.data) {
      return badRequest('Pricing request not found');
    }

    if (pricingExecutionId && !pricingExecutionRes.data) {
      return badRequest('Pricing execution not found');
    }

    const insertPayload: SupplierInboundRequestInsert = {
      supplier_id: supplierId,
      pipeline_id: pipelineId,
      request_type: 'pricing',
      request_status: 'open',
      notes,
      payload: {
        source: 'nationsnrg_pipeline',
        supplierId,
        supplierName: supplierRes.data.supplier_name,
        pipelineId,
        pricingRequestId,
        pricingExecutionId,
        pricingRequest: pricingRequestRes.data ?? null,
        customPayload: body.payload ?? {},
      },
    };

    const insertRes = await supabase
      .from('supplier_inbound_requests')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    if (pricingExecutionId && pricingExecutionRes.data) {
      const updatePayload: PricingExecutionUpdate = {
        execution_status: 'sent_to_supplier',
        operator_notes: notes ?? pricingExecutionRes.data.operator_notes,
        sent_at: pricingExecutionRes.data.sent_at ?? new Date().toISOString(),
        execution_payload: mergeJson(pricingExecutionRes.data.execution_payload, {
          supplierInboundRequestId: insertRes.data.id,
          supplierId,
          supplierName: supplierRes.data.supplier_name,
          routedAt: new Date().toISOString(),
        }),
      };

      const updateRes = await supabase
        .from('pricing_request_executions')
        .update(updatePayload)
        .eq('id', pricingExecutionId);

      if (updateRes.error) {
        return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      supplierInboundRequest: insertRes.data,
      message: 'Pricing request routed to supplier portal successfully.',
    });
  } catch (error) {
    console.error('suppliers/request/pricing error', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}