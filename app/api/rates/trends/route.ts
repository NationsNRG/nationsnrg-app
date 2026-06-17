import { ok, fail } from '@/lib/api/response';
import { getServiceClient } from '@/lib/supabase/server';
import { rateIntelligence } from '@/lib/rateIntelligence';
import type { Json } from '@/types/supabase';

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

function now(): string {
  return new Date().toISOString();
}

function safeError(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function normalizeRegion(input: string | null): string {
  if (!input) return 'TX';

  const cleaned = input.trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : 'TX';
}

async function log(
  supabase: ReturnType<typeof getServiceClient>,
  payload: SystemActivityInsert,
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('log_failed', error.message);
  }
}

export async function GET(req: Request): Promise<Response> {
  const supabase = getServiceClient();

  try {
    const url = new URL(req.url);
    const region = normalizeRegion(url.searchParams.get('region'));

    const trends = await rateIntelligence.getMarketTrends(region);

    return ok({
      trends,
    });
  } catch (err) {
    const message = safeError(err);

    await log(supabase, {
      event_type: 'market_trends_error',
      entity_id: 'api/rates/trends',
      error_message: message,
      metadata: {},
      created_at: now(),
    });

    return fail(message, 500);
  }
}