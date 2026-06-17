import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import {
  buildNormalizedPricingRequest,
  resolvePricingProvider,
  startPricingIntegration,
} from '@/lib/integrations/pricing';

type RequestBody = {
  pipelineId?: string;
  pricingRequestId?: string;
  pricingExecutionId?: string | null;
  providerKey?: string | null;
};

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
    const pricingRequestId = normalizeNullableString(body.pricingRequestId);
    const pricingExecutionId = normalizeNullableString(body.pricingExecutionId);
    const providerKey = normalizeNullableString(body.providerKey);

    if (!pipelineId) {
      return badRequest('pipelineId required');
    }

    if (!pricingRequestId) {
      return badRequest('pricingRequestId required');
    }

    const supabase = getSupabase();

    const [pipelineRes, requestRes, executionRes] = await Promise.all([
      supabase.from('deal_pipeline').select('*').eq('id', pipelineId).maybeSingle(),
      supabase.from('pricing_requests').select('*').eq('id', pricingRequestId).maybeSingle(),
      pricingExecutionId
        ? supabase
            .from('pricing_request_executions')
            .select('*')
            .eq('id', pricingExecutionId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (requestRes.error) {
      return NextResponse.json({ error: requestRes.error.message }, { status: 500 });
    }

    if (executionRes.error) {
      return NextResponse.json({ error: executionRes.error.message }, { status: 500 });
    }

    if (!pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (!requestRes.data || requestRes.data.pipeline_id !== pipelineId) {
      return badRequest('Invalid pricingRequestId');
    }

    if (
      pricingExecutionId &&
      (!executionRes.data || executionRes.data.pipeline_id !== pipelineId)
    ) {
      return badRequest('Invalid pricingExecutionId');
    }

    const normalizedRequest = buildNormalizedPricingRequest({
      pipelineId,
      pricingRequestId,
      supplierName: requestRes.data.supplier_name ?? pipelineRes.data.supplier_name ?? null,
      utilityName: requestRes.data.utility_name ?? pipelineRes.data.utility_name ?? null,
      commodity: requestRes.data.commodity ?? pipelineRes.data.commodity ?? null,
      serviceAddress: pipelineRes.data.service_address ?? null,
      accountNumber: pipelineRes.data.account_number ?? null,
      requestedUsage: requestRes.data.requested_usage ?? null,
      requestedTermMonths: requestRes.data.requested_term_months ?? null,
      requestSource: 'pipeline',
    });

    const provider = resolvePricingProvider(normalizedRequest.supplierName, providerKey);

    const integrationResult = startPricingIntegration({
      request: normalizedRequest,
      provider,
    });

    if (pricingExecutionId && executionRes.data) {
      const updatePayload: PricingExecutionUpdate = {
        execution_status:
          provider.integrationMode === 'widget' ? 'sent_to_supplier' : executionRes.data.execution_status,
        send_method:
          provider.integrationMode === 'widget'
            ? 'widget'
            : provider.integrationMode === 'manual_phone'
              ? 'phone'
              : provider.integrationMode === 'manual_portal'
                ? 'portal'
                : executionRes.data.send_method,
        sent_at: executionRes.data.sent_at ?? new Date().toISOString(),
        execution_payload: mergeExecutionPayload(executionRes.data.execution_payload, {
          integrationProviderKey: String(provider.providerKey),
          integrationMode: provider.integrationMode,
          launchUrl: integrationResult.launchUrl ?? null,
          integrationMessage: integrationResult.message,
          rawPayload: integrationResult.rawPayload ?? {},
        }),
      };

      const updateRes = await supabase
        .from('pricing_request_executions')
        .update(updatePayload)
        .eq('id', pricingExecutionId)
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
    console.error('pricing/start error', err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}