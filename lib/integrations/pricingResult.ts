import type { Database, Json } from '@/types/supabase';
import type { NormalizedPricingResponse } from '@/lib/integrations/types';

export type PricingRequestRow =
  Database['public']['Tables']['pricing_requests']['Row'];

export type PricingQuoteInsert =
  Database['public']['Tables']['pricing_quotes']['Insert'];

export type PricingQuoteStatus = 'received' | 'selected' | 'rejected' | 'expired';

export type PricingResultIngestionInput = {
  pipelineId: string;
  pricingRequest: PricingRequestRow;
  response: NormalizedPricingResponse;
  selected?: boolean;
};

export type PricingResultIngestionRecord = {
  pricingQuoteInsert: PricingQuoteInsert;
  externalReference: string | null;
  sourceProviderKey: string;
  sourceMode: string;
};

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeNullableTimestamp(value: string | null | undefined): string | null {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid validUntil timestamp in pricing result.');
  }

  return parsed.toISOString();
}

function assertNormalizedQuote(
  response: NormalizedPricingResponse,
): NonNullable<NormalizedPricingResponse['normalizedQuote']> {
  if (!response.success) {
    throw new Error('Cannot ingest unsuccessful pricing response.');
  }

  if (!response.normalizedQuote) {
    throw new Error('Pricing response does not include a normalized quote.');
  }

  return response.normalizedQuote;
}

function resolveQuoteStatus(selected: boolean | undefined): PricingQuoteStatus {
  return selected === true ? 'selected' : 'received';
}

function buildQuoteMetadata(input: {
  response: NormalizedPricingResponse;
  pricingRequest: PricingRequestRow;
  externalReference: string | null;
}): Json {
  return {
    source: 'integration_result',
    sourceProviderKey: input.response.providerKey,
    sourceMode: input.response.mode,
    externalReference: input.externalReference,
    requiresManualOperator: input.response.requiresManualOperator,
    pricingRequestId: input.pricingRequest.id,
    pricingRequestStatus: input.pricingRequest.status,
    rawPayload: input.response.rawPayload ?? {},
  };
}

export function buildPricingQuoteInsertFromResult(
  input: PricingResultIngestionInput,
): PricingResultIngestionRecord {
  const normalizedQuote = assertNormalizedQuote(input.response);

  const supplierName =
    normalizeNullableString(normalizedQuote.supplierName) ??
    normalizeNullableString(input.pricingRequest.supplier_name) ??
    'Unknown Supplier';

  const utilityName =
    normalizeNullableString(normalizedQuote.utilityName) ??
    normalizeNullableString(input.pricingRequest.utility_name);

  const commodity =
    normalizeNullableString(normalizedQuote.commodity) ??
    normalizeNullableString(input.pricingRequest.commodity);

  const externalReference = normalizeNullableString(input.response.externalReference);

  const pricingQuoteInsert: PricingQuoteInsert = {
    pipeline_id: input.pipelineId,
    pricing_request_id: input.pricingRequest.id,
    supplier_name: supplierName,
    utility_name: utilityName,
    commodity,
    rate: normalizeNullableNumber(normalizedQuote.rate),
    rate_unit: normalizeNullableString(normalizedQuote.rateUnit),
    term_months: normalizeNullableNumber(normalizedQuote.termMonths),
    estimated_monthly_savings: normalizeNullableNumber(
      normalizedQuote.estimatedMonthlySavings,
    ),
    estimated_annual_savings: normalizeNullableNumber(
      normalizedQuote.estimatedAnnualSavings,
    ),
    valid_until: normalizeNullableTimestamp(normalizedQuote.validUntil),
    status: resolveQuoteStatus(input.selected),
    received_at: new Date().toISOString(),
    metadata: buildQuoteMetadata({
      response: input.response,
      pricingRequest: input.pricingRequest,
      externalReference,
    }),
  };

  return {
    pricingQuoteInsert,
    externalReference,
    sourceProviderKey: String(input.response.providerKey),
    sourceMode: input.response.mode,
  };
}

export function shouldSelectIngestedQuote(selected: boolean | undefined): boolean {
  return selected === true;
}

export function buildPricingResultSummary(
  response: NormalizedPricingResponse,
): {
  supplierName: string | null;
  rate: number | null;
  rateUnit: string | null;
  termMonths: number | null;
  validUntil: string | null;
  externalReference: string | null;
} {
  const quote = response.normalizedQuote;

  return {
    supplierName: normalizeNullableString(quote?.supplierName),
    rate: normalizeNullableNumber(quote?.rate),
    rateUnit: normalizeNullableString(quote?.rateUnit),
    termMonths: normalizeNullableNumber(quote?.termMonths),
    validUntil: normalizeNullableString(quote?.validUntil),
    externalReference: normalizeNullableString(response.externalReference),
  };
}