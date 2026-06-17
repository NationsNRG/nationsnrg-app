import { ok, fail } from '@/lib/api/response';
import { getServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rateIntelligence } from '@/lib/rateIntelligence';
import type { Json } from '@/types/supabase';

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

interface RateIngestRequest {
  supplierId: string;
  region: string;
  businessTypeId: number;
  fixedRate: number;
  termMonths: number;
  effectiveDate: string;
  marketIndex?: string;
  volatilityScore?: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseRequestBody(value: unknown): RateIngestRequest | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const supplierId = normalizeString(candidate.supplierId);
  const region = normalizeString(candidate.region);
  const effectiveDate = normalizeString(candidate.effectiveDate);
  const marketIndex = normalizeString(candidate.marketIndex);

  const businessTypeId = normalizeNumber(candidate.businessTypeId);
  const fixedRate = normalizeNumber(candidate.fixedRate);
  const termMonths = normalizeNumber(candidate.termMonths);
  const volatilityScore = normalizeOptionalNumber(candidate.volatilityScore);

  if (
    supplierId.length === 0 ||
    region.length === 0 ||
    effectiveDate.length === 0 ||
    !Number.isFinite(businessTypeId) ||
    !Number.isFinite(fixedRate) ||
    !Number.isFinite(termMonths)
  ) {
    return null;
  }

  return {
    supplierId,
    region,
    businessTypeId,
    fixedRate,
    termMonths,
    effectiveDate,
    marketIndex: marketIndex.length > 0 ? marketIndex : undefined,
    volatilityScore,
  };
}

function validatePayload(payload: RateIngestRequest): string | null {
  const validTerms = new Set([12, 24, 36, 48, 60]);

  if (payload.businessTypeId <= 0) {
    return 'businessTypeId must be a positive number';
  }

  if (payload.fixedRate <= 0) {
    return 'fixedRate must be greater than 0';
  }

  if (!validTerms.has(payload.termMonths)) {
    return 'termMonths must be one of 12, 24, 36, 48, or 60';
  }

  const parsedDate = new Date(payload.effectiveDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'effectiveDate must be a valid date string';
  }

  if (
    payload.volatilityScore !== undefined &&
    (payload.volatilityScore < 0 || payload.volatilityScore > 100)
  ) {
    return 'volatilityScore must be between 0 and 100';
  }

  return null;
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: SystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('rate_route_log_failed', error.message);
  }
}

export async function POST(req: Request): Promise<Response> {
  const supabase = getServiceClient();

  try {
    const rawBody: unknown = await req.json();
    const payload = parseRequestBody(rawBody);

    if (!payload) {
  await logSystemActivity(supabase, {
    event_type: 'rate_ingest_invalid_payload',
    entity_id: 'rate_ingest',
    error_message: 'Invalid request body',
    metadata: null,
    created_at: nowIso(),
  });

  return fail('Invalid request body', 400);
}

const validationError = validatePayload(payload);

    if (validationError) {
      await logSystemActivity(supabase, {
        event_type: 'rate_ingest_validation_failed',
        entity_id: payload.supplierId,
        error_message: validationError,
        metadata: {
          region: payload.region,
          businessTypeId: payload.businessTypeId,
          termMonths: payload.termMonths,
        },
        created_at: nowIso(),
      });

      return fail(validationError, 400);
    }

    const rateId = await rateIntelligence.ingestRate({
      supplierId: payload.supplierId,
      region: payload.region,
      businessTypeId: payload.businessTypeId,
      fixedRate: payload.fixedRate,
      termMonths: payload.termMonths,
      effectiveDate: new Date(payload.effectiveDate),
      marketIndex: payload.marketIndex,
      volatilityScore: payload.volatilityScore,
    });

    return ok({
      rateId,
      message: 'Rate ingested successfully',
    });
  } catch (error) {
    const message = safeErrorMessage(error);

    await logSystemActivity(supabase, {
      event_type: 'rate_ingest_route_failed',
      entity_id: 'rate_ingest',
      error_message: message,
      metadata: null,
      created_at: nowIso(),
    });

    return fail(message, 500);
  }
}