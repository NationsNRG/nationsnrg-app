import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import type { NormalizedPricingResponse } from '@/lib/integrations/types';
import {
  buildPricingQuoteInsertFromResult,
  buildPricingResultSummary,
  shouldSelectIngestedQuote,
} from '@/lib/integrations/pricingResult';

type RequestBody = {
  pipelineId?: string;
  pricingRequestId?: string;
  pricingExecutionId?: string | null;
  selected?: boolean;
  response?: NormalizedPricingResponse;
};

type PricingQuoteUpdate =
  Database['public']['Tables']['pricing_quotes']['Update'];

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

function mergeQuoteMetadata(
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

    if (!pipelineId) {
      return badRequest('pipelineId required');
    }

    if (!pricingRequestId) {
      return badRequest('pricingRequestId required');
    }

    if (!body.response) {
      return badRequest('response required');
    }

    const supabase = getSupabase();

    const [pipelineRes, pricingRequestRes] = await Promise.all([
      supabase
        .from('deal_pipeline')
        .select('id, stage')
        .eq('id', pipelineId)
        .maybeSingle(),
      supabase
        .from('pricing_requests')
        .select('*')
        .eq('id', pricingRequestId)
        .maybeSingle(),
    ]);

    if (pipelineRes.error) {
      return NextResponse.json({ error: pipelineRes.error.message }, { status: 500 });
    }

    if (pricingRequestRes.error) {
      return NextResponse.json({ error: pricingRequestRes.error.message }, { status: 500 });
    }

    if (!pipelineRes.data) {
      return badRequest('Pipeline not found');
    }

    if (!pricingRequestRes.data || pricingRequestRes.data.pipeline_id !== pipelineId) {
      return badRequest('Invalid pricingRequestId');
    }

    const ingestionRecord = buildPricingQuoteInsertFromResult({
      pipelineId,
      pricingRequest: pricingRequestRes.data,
      response: body.response,
      selected: body.selected,
    });

    const metadataWithExecution = mergeQuoteMetadata(
      ingestionRecord.pricingQuoteInsert.metadata,
      {
        pricingExecutionId,
      },
    );

    const pricingQuoteInsert = {
      ...ingestionRecord.pricingQuoteInsert,
      metadata: metadataWithExecution,
    };

    // Deduplicate by external reference within the same pipeline if possible.
    if (ingestionRecord.externalReference) {
      const existingQuotesRes = await supabase
        .from('pricing_quotes')
        .select('id, metadata')
        .eq('pipeline_id', pipelineId);

      if (existingQuotesRes.error) {
        return NextResponse.json({ error: existingQuotesRes.error.message }, { status: 500 });
      }

      const duplicateQuote = (existingQuotesRes.data ?? []).find((quote) => {
        if (!isJsonObject(quote.metadata)) {
          return false;
        }

        const existingExternalReference = normalizeNullableString(
          typeof quote.metadata.externalReference === 'string'
            ? quote.metadata.externalReference
            : null,
        );

        return existingExternalReference === ingestionRecord.externalReference;
      });

      if (duplicateQuote) {
        return NextResponse.json(
          {
            error: `Duplicate pricing result detected for external reference ${ingestionRecord.externalReference}.`,
          },
          { status: 409 },
        );
      }
    }

    if (shouldSelectIngestedQuote(body.selected)) {
      const deselectPayload: PricingQuoteUpdate = {
        status: 'received',
      };

      const deselectRes = await supabase
        .from('pricing_quotes')
        .update(deselectPayload)
        .eq('pipeline_id', pipelineId)
        .eq('status', 'selected');

      if (deselectRes.error) {
        return NextResponse.json({ error: deselectRes.error.message }, { status: 500 });
      }
    }

    const insertRes = await supabase
      .from('pricing_quotes')
      .insert(pricingQuoteInsert)
      .select('*')
      .single();

    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    const updatePipelineRes = await supabase
      .from('deal_pipeline')
      .update({
        stage: 'quoted',
      })
      .eq('id', pipelineId);

    if (updatePipelineRes.error) {
      return NextResponse.json({ error: updatePipelineRes.error.message }, { status: 500 });
    }

    const updatePricingRequestRes = await supabase
      .from('pricing_requests')
      .update({
        status: 'completed',
      })
      .eq('id', pricingRequestId);

    if (updatePricingRequestRes.error) {
      return NextResponse.json(
        { error: updatePricingRequestRes.error.message },
        { status: 500 },
      );
    }

    if (pricingExecutionId) {
      const pricingExecutionUpdate: PricingExecutionUpdate = {
        execution_status: 'quote_received',
        external_reference: ingestionRecord.externalReference,
        response_received_at: new Date().toISOString(),
        execution_payload: {
          sourceProviderKey: ingestionRecord.sourceProviderKey,
          sourceMode: ingestionRecord.sourceMode,
          createdQuoteId: insertRes.data.id,
        },
      };

      const updatePricingExecutionRes = await supabase
        .from('pricing_request_executions')
        .update(pricingExecutionUpdate)
        .eq('id', pricingExecutionId)
        .eq('pipeline_id', pipelineId);

      if (updatePricingExecutionRes.error) {
        return NextResponse.json(
          { error: updatePricingExecutionRes.error.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      createdQuote: insertRes.data,
      summary: buildPricingResultSummary(body.response),
      message: 'Pricing result ingested and quote created successfully.',
    });
  } catch (err) {
    console.error('pricing/result error', err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}