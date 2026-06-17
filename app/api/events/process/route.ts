import { ok, fail } from '@/lib/api/response';
import { getServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { eventProcessor } from '@/lib/eventProcessor';
import type { Json } from '@/types/supabase';

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  return fallback;
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: SystemActivityInsert,
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

export async function POST(req: Request): Promise<Response> {
  const supabase = getServiceClient();

  try {
    let requestedLimit = 50;

    try {
      const body: unknown = await req.json();

      if (typeof body === 'object' && body !== null) {
        const candidate = (body as { limit?: unknown }).limit;
        requestedLimit = normalizePositiveInteger(candidate, 50);
      }
    } catch {
      requestedLimit = 50;
    }

    const processed = await eventProcessor.processPendingEvents(requestedLimit);

    return ok({
      processed,
      requestedLimit,
      processedAt: nowIso(),
    });
  } catch (error) {
    const message = safeErrorMessage(error);

    await logSystemActivity(supabase, {
      event_type: 'event_processor_route_failed',
      entity_id: 'api/events/process',
      error_message: message,
      metadata: {
        method: 'POST',
      },
      created_at: nowIso(),
    });

    return fail(message, 500);
  }
}

export async function GET(): Promise<Response> {
  return ok({
    status: 'Event processor ready',
    endpoints: {
      post: '/api/events/process',
      emit: 'Use eventEmitter.emit() in application code',
    },
    capabilities: {
      processesPendingEvents: true,
      acceptsOptionalLimitInPostBody: true,
    },
  });
}