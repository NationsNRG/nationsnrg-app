import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import {
  buildNormalizedEnrollmentRequest,
  resolveEnrollmentProvider,
  startEnrollmentIntegration,
} from '@/lib/integrations/enrollment';

type RequestBody = {
  pipelineId?: string;
  enrollmentAttemptId?: string;
  enrollmentExecutionId?: string | null;
  providerKey?: string | null;
};

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

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeExecutionPayload(
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

    const pipelineId = normalizeNullableString(body.pipelineId);
    const enrollmentAttemptId = normalizeNullableString(body.enrollmentAttemptId);
    const enrollmentExecutionId = normalizeNullableString(body.enrollmentExecutionId);
    const providerKey = normalizeNullableString(body.providerKey);

    if (!pipelineId) {
      return badRequest('pipelineId required');
    }

    if (!enrollmentAttemptId) {
      return badRequest('enrollmentAttemptId required');
    }

    const supabase = getSupabase();

    const [pipelineRes, attemptRes, quoteRes, executionRes] = await Promise.all([
      supabase.from('deal_pipeline').select('*').eq('id', pipelineId).maybeSingle(),
      supabase.from('enrollment_attempts').select('*').eq('id', enrollmentAttemptId).maybeSingle(),
      supabase
        .from('pricing_quotes')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('status', 'selected')
        .maybeSingle(),
      enrollmentExecutionId
        ? supabase
            .from('enrollment_executions')
            .select('*')
            .eq('id', enrollmentExecutionId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (attemptRes.error) {
      return NextResponse.json({ error: attemptRes.error.message }, { status: 500 });
    }

    if (quoteRes.error) {
      return NextResponse.json({ error: quoteRes.error.message }, { status: 500 });
    }

    if (executionRes.error) {
      return NextResponse.json({ error: executionRes.error.message }, { status: 500 });
    }

    if (!pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (!attemptRes.data || attemptRes.data.pipeline_id !== pipelineId) {
      return badRequest('Invalid enrollmentAttemptId');
    }

    if (
      enrollmentExecutionId &&
      (!executionRes.data || executionRes.data.pipeline_id !== pipelineId)
    ) {
      return badRequest('Invalid enrollmentExecutionId');
    }

    const normalizedRequest = buildNormalizedEnrollmentRequest({
      pipelineId,
      enrollmentAttemptId,
      supplierName:
        attemptRes.data.supplier_name ??
        quoteRes.data?.supplier_name ??
        pipelineRes.data.supplier_name ??
        null,
      utilityName: quoteRes.data?.utility_name ?? pipelineRes.data.utility_name ?? null,
      commodity: quoteRes.data?.commodity ?? pipelineRes.data.commodity ?? null,
      serviceAddress: pipelineRes.data.service_address ?? null,
      accountNumber: pipelineRes.data.account_number ?? null,
      customerName: pipelineRes.data.customer_name ?? null,
      customerEmail: pipelineRes.data.customer_email ?? null,
      customerPhone: pipelineRes.data.customer_phone ?? null,
      selectedQuote: quoteRes.data
        ? {
            pricingQuoteId: quoteRes.data.id,
            rate: quoteRes.data.rate,
            rateUnit: quoteRes.data.rate_unit,
            termMonths: quoteRes.data.term_months,
          }
        : null,
    });

    const provider = resolveEnrollmentProvider(normalizedRequest.supplierName, providerKey);

    const integrationResult = startEnrollmentIntegration({
      request: normalizedRequest,
      provider,
    });

    if (enrollmentExecutionId && executionRes.data) {
      const updatePayload: EnrollmentExecutionUpdate = {
        execution_status:
          provider.integrationMode === 'widget'
            ? 'submitted_to_supplier'
            : executionRes.data.execution_status,
        send_method:
          provider.integrationMode === 'widget'
            ? 'widget'
            : provider.integrationMode === 'manual_phone'
              ? 'phone'
              : provider.integrationMode === 'manual_portal'
                ? 'portal'
                : executionRes.data.send_method,
        submitted_at: executionRes.data.submitted_at ?? new Date().toISOString(),
        execution_payload: mergeExecutionPayload(executionRes.data.execution_payload, {
          integrationProviderKey: String(provider.providerKey),
          integrationMode: provider.integrationMode,
          launchUrl: integrationResult.launchUrl ?? null,
          integrationMessage: integrationResult.message,
          rawPayload: integrationResult.rawPayload ?? {},
        }),
      };

      const updateRes = await supabase
        .from('enrollment_executions')
        .update(updatePayload)
        .eq('id', enrollmentExecutionId)
        .eq('pipeline_id', pipelineId);

      if (updateRes.error) {
        return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
      }
    }

    const action =
      isJsonObject(integrationResult.rawPayload) &&
      typeof integrationResult.rawPayload.action === 'string'
        ? integrationResult.rawPayload.action
        : integrationResult.launchUrl
          ? 'open_url'
          : 'manual_instruction';

    const url =
      isJsonObject(integrationResult.rawPayload) &&
      typeof integrationResult.rawPayload.url === 'string'
        ? integrationResult.rawPayload.url
        : integrationResult.launchUrl ?? null;

    return NextResponse.json({
      provider,
      integrationResult,
      ui: {
        action,
        url,
        message: integrationResult.message,
      },
    });
  } catch (err) {
    console.error('enrollment/start error', err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}