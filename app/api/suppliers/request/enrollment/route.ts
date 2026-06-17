import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';

type RequestBody = {
  supplierId?: string;
  pipelineId?: string | null;
  enrollmentAttemptId?: string | null;
  enrollmentExecutionId?: string | null;
  notes?: string | null;
  payload?: Json;
};

type SupplierInboundRequestInsert =
  Database['public']['Tables']['supplier_inbound_requests']['Insert'];

type EnrollmentExecutionUpdate =
  Database['public']['Tables']['enrollment_executions']['Update'];

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
  try {
    const body = (await req.json()) as RequestBody;

    const supplierId = normalizeNullableString(body.supplierId);
    const pipelineId = normalizeNullableString(body.pipelineId);
    const enrollmentAttemptId = normalizeNullableString(body.enrollmentAttemptId);
    const enrollmentExecutionId = normalizeNullableString(body.enrollmentExecutionId);
    const notes = normalizeNullableString(body.notes);

    if (!supplierId) {
      return badRequest('supplierId required');
    }

    const supabase = getSupabase();

    const [supplierRes, pipelineRes, enrollmentAttemptRes, enrollmentExecutionRes] =
      await Promise.all([
        supabase.from('suppliers').select('id, supplier_name').eq('id', supplierId).maybeSingle(),
        pipelineId
          ? supabase.from('deal_pipeline').select('id').eq('id', pipelineId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        enrollmentAttemptId
          ? supabase
              .from('enrollment_attempts')
              .select('*')
              .eq('id', enrollmentAttemptId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        enrollmentExecutionId
          ? supabase
              .from('enrollment_executions')
              .select('*')
              .eq('id', enrollmentExecutionId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (supplierRes.error) {
      return NextResponse.json({ error: supplierRes.error.message }, { status: 500 });
    }

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (enrollmentAttemptRes.error) {
      return NextResponse.json({ error: enrollmentAttemptRes.error.message }, { status: 500 });
    }

    if (enrollmentExecutionRes.error) {
      return NextResponse.json({ error: enrollmentExecutionRes.error.message }, { status: 500 });
    }

    if (!supplierRes.data) {
      return badRequest('Supplier not found');
    }

    if (pipelineId && !pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (enrollmentAttemptId && !enrollmentAttemptRes.data) {
      return badRequest('Enrollment attempt not found');
    }

    if (enrollmentExecutionId && !enrollmentExecutionRes.data) {
      return badRequest('Enrollment execution not found');
    }

    const insertPayload: SupplierInboundRequestInsert = {
      supplier_id: supplierId,
      pipeline_id: pipelineId,
      request_type: 'enrollment',
      request_status: 'open',
      notes,
      payload: {
        source: 'nationsnrg_pipeline',
        supplierId,
        supplierName: supplierRes.data.supplier_name,
        pipelineId,
        enrollmentAttemptId,
        enrollmentExecutionId,
        enrollmentAttempt: enrollmentAttemptRes.data ?? null,
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

    if (enrollmentExecutionId && enrollmentExecutionRes.data) {
      const updatePayload: EnrollmentExecutionUpdate = {
        execution_status: 'submitted_to_supplier',
        operator_notes: notes ?? enrollmentExecutionRes.data.operator_notes,
        submitted_at: enrollmentExecutionRes.data.submitted_at ?? new Date().toISOString(),
        execution_payload: mergeJson(enrollmentExecutionRes.data.execution_payload, {
          supplierInboundRequestId: insertRes.data.id,
          supplierId,
          supplierName: supplierRes.data.supplier_name,
          routedAt: new Date().toISOString(),
        }),
      };

      const updateRes = await supabase
        .from('enrollment_executions')
        .update(updatePayload)
        .eq('id', enrollmentExecutionId);

      if (updateRes.error) {
        return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      supplierInboundRequest: insertRes.data,
      message: 'Enrollment request routed to supplier portal successfully.',
    });
  } catch (error) {
    console.error('suppliers/request/enrollment error', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}