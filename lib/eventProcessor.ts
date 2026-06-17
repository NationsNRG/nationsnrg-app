import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { eventHandlers } from './eventHandlers';
import type { Json } from '@/types/supabase';

type EventQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter';

interface EventQueueRow {
  id: string;
  event_type: string;
  event_data: Json;
  triggered_at: string;
  status: EventQueueStatus;
  processed_at: string | null;
  retry_count: number;
  last_error: string | null;
  scheduled_for: string;
  priority: number;
  lead_id: string | null;
  conversation_id: string | null;
  created_at: string;
  max_retries: number;
  processing_started_at: string | null;
  lease_expires_at: string | null;
  processor_id: string | null;
  dedupe_key: string | null;
  updated_at: string;
}

interface EventQueueUpdate {
  status?: EventQueueStatus;
  processing_started_at?: string | null;
  lease_expires_at?: string | null;
  processor_id?: string | null;
  updated_at?: string;
}

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

const DEFAULT_BATCH_LIMIT = 50;
const DEFAULT_LEASE_SECONDS = 300;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return fallback;
}

function buildProcessorId(): string {
  return `event-processor:${process.pid}:${Date.now()}`;
}

function addSecondsToNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isEventQueueRow(value: unknown): value is EventQueueRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.trim().length > 0;
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: SystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

async function markEventProcessing(
  supabase: SupabaseClient,
  eventId: string,
  processorId: string,
  leaseSeconds: number
): Promise<boolean> {
  const payload: EventQueueUpdate = {
    status: 'processing',
    processing_started_at: nowIso(),
    lease_expires_at: addSecondsToNow(leaseSeconds),
    processor_id: processorId,
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from('event_queue')
    .update(payload)
    .eq('id', eventId)
    .eq('status', 'pending')
    .select('*');

  if (error) {
    await logSystemActivity(supabase, {
      event_type: 'event_mark_processing_failed',
      entity_id: eventId,
      error_message: error.message,
      metadata: {
        processorId,
        leaseSeconds,
      },
      created_at: nowIso(),
    });
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function fetchPendingEvents(
  supabase: SupabaseClient,
  limit: number
): Promise<EventQueueRow[]> {
  const now = nowIso();

  const { data, error } = await supabase
    .from('event_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (error) {
    await logSystemActivity(supabase, {
      event_type: 'event_queue_fetch_failed',
      entity_id: 'event_processor',
      error_message: error.message,
      metadata: {
        limit,
        now,
      },
      created_at: nowIso(),
    });
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isEventQueueRow);
}

class EventProcessor {
  private readonly supabase: SupabaseClient;
  private readonly processorId: string;

  constructor() {
    this.supabase = getSupabaseClient();
    this.processorId = buildProcessorId();
  }

  /**
   * Process all pending events
   */
  async processPendingEvents(limit: number = DEFAULT_BATCH_LIMIT): Promise<number> {
    const safeLimit = Math.max(1, normalizeNumber(limit, DEFAULT_BATCH_LIMIT));
    const events = await fetchPendingEvents(this.supabase, safeLimit);

    if (events.length === 0) {
      return 0;
    }

    let processed = 0;

    for (const event of events) {
      const locked = await markEventProcessing(
        this.supabase,
        event.id,
        this.processorId,
        DEFAULT_LEASE_SECONDS
      );

      if (!locked) {
        continue;
      }

      try {
        const processingEvent: EventQueueRow = {
          ...event,
          status: 'processing',
          processing_started_at: nowIso(),
          lease_expires_at: addSecondsToNow(DEFAULT_LEASE_SECONDS),
          processor_id: this.processorId,
          updated_at: nowIso(),
        };

        await eventHandlers.processEvent(processingEvent);
        processed += 1;
      } catch (error) {
        await logSystemActivity(this.supabase, {
          event_type: 'event_processor_unhandled_error',
          entity_id: event.id,
          error_message: safeErrorMessage(error),
          metadata: {
            processorId: this.processorId,
            eventType: event.event_type,
          },
          created_at: nowIso(),
        });

        await this.supabase
          .from('event_queue')
          .update({
            status: 'pending',
            last_error: safeErrorMessage(error),
            scheduled_for: addSecondsToNow(300),
            processor_id: null,
            processing_started_at: null,
            lease_expires_at: null,
            updated_at: nowIso(),
          })
          .eq('id', event.id);
      }
    }

    return processed;
  }

  /**
   * Run continuously (only for long-lived worker environments)
   */
  start(intervalMs: number = 30000): ReturnType<typeof setInterval> {
    const safeIntervalMs = Math.max(1000, normalizeNumber(intervalMs, 30000));

    console.log('Event processor started');

    return setInterval(() => {
      void this.processPendingEvents().then((count) => {
        if (count > 0) {
          console.log(`Processed ${count} events`);
        }
      }).catch(async (error: unknown) => {
        await logSystemActivity(this.supabase, {
          event_type: 'event_processor_loop_failed',
          entity_id: 'event_processor',
          error_message: safeErrorMessage(error),
          metadata: {
            processorId: this.processorId,
            intervalMs: safeIntervalMs,
          },
          created_at: nowIso(),
        });
      });
    }, safeIntervalMs);
  }
}

export const eventProcessor = new EventProcessor();