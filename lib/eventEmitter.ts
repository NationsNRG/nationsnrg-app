import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];
type DbSystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

type EventQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter';

export type EventType =
  | 'email_opened'
  | 'email_clicked'
  | 'proposal_viewed'
  | 'lead_discovered'
  | 'lead_engaged'
  | 'contract_expiring'
  | 'deal_closed'
  | 'objection_raised'
  | 'interest_shown'
  | 'conversation_stalled'
  | 'ai_response_sent'
  | 'lead_replied';

export interface EventData {
  leadId?: string;
  conversationId?: string;
  emailId?: string;
  metadata?: Record<string, Json | undefined>;
  scheduledFor?: Date;
  priority?: number;
  dedupeKey?: string;
  maxRetries?: number;
}

interface EventQueueInsert {
  event_type: string;
  event_data: Json;
  triggered_at: string;
  status: EventQueueStatus;
  scheduled_for: string;
  priority: number;
  lead_id: string | null;
  conversation_id: string | null;
  retry_count: number;
  max_retries: number;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
}

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

const DEFAULT_PRIORITY = 5;
const DEFAULT_MAX_RETRIES = 5;

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

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value: unknown): Date | null {
  if (!(value instanceof Date)) {
    return null;
  }

  return Number.isNaN(value.getTime()) ? null : value;
}

function normalizePriority(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 10) return 10;
  return rounded;
}

function normalizeMaxRetries(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_MAX_RETRIES;
  }

  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  return rounded;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function buildEventDataPayload(data: EventData): Json {
  return {
    leadId: normalizeNullableString(data.leadId),
    conversationId: normalizeNullableString(data.conversationId),
    emailId: normalizeNullableString(data.emailId),
    metadata: data.metadata ?? {},
    dedupeKey: normalizeNullableString(data.dedupeKey),
    priority:
      typeof data.priority === 'number' && Number.isFinite(data.priority)
        ? data.priority
        : null,
    maxRetries:
      typeof data.maxRetries === 'number' && Number.isFinite(data.maxRetries)
        ? data.maxRetries
        : null,
    scheduledFor:
      normalizeDate(data.scheduledFor)?.toISOString() ?? null,
  };
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
  payload: DbSystemActivityInsert
): Promise<void> {
  const { error } = await supabase
    .from('system_activity')
    .insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

class EventEmitter {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.supabase !== null) {
      return this.supabase;
    }

    this.supabase = getSupabaseClient();
    return this.supabase;
  }

    async emit(eventType: EventType, data: EventData): Promise<string> {
    const supabase = this.getClient();
    const scheduledFor = normalizeDate(data.scheduledFor) ?? new Date();
    const priority = normalizePriority(
      data.priority,
      this.getPriorityForEvent(eventType)
    );
    const maxRetries = normalizeMaxRetries(data.maxRetries);

    const payload: EventQueueInsert = {
      event_type: eventType,
      event_data: buildEventDataPayload(data),
      triggered_at: nowIso(),
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
      priority,
      lead_id: normalizeNullableString(data.leadId),
      conversation_id: normalizeNullableString(data.conversationId),
      retry_count: 0,
      max_retries: maxRetries,
      dedupe_key: normalizeNullableString(data.dedupeKey),
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data: insertedRows, error } = await supabase
      .from('event_queue')
      .insert(payload)
      .select('*');

    if (error) {
      await logSystemActivity(supabase, {
        activity_type: 'event_emit_failed',
        lead_id: payload.lead_id,
        details: {
          message: error.message,
          eventType,
          leadId: payload.lead_id,
          conversationId: payload.conversation_id,
          scheduledFor: payload.scheduled_for,
          priority,
          dedupeKey: payload.dedupe_key,
          maxRetries,
        },
        created_at: nowIso(),
      });

      throw new Error(`Failed to emit event: ${error.message}`);
    }

    const inserted = Array.isArray(insertedRows) && insertedRows.length > 0
      ? insertedRows[0]
      : null;

    if (!isEventQueueRow(inserted)) {
      await logSystemActivity(supabase, {
        activity_type: 'event_emit_empty_result',
        lead_id: payload.lead_id,
        details: {
          message: 'Insert returned no event row',
          eventType,
          leadId: payload.lead_id,
          conversationId: payload.conversation_id,
        },
        created_at: nowIso(),
      });

      throw new Error('Failed to emit event: insert returned no row');
    }

    return inserted.id;
  }

  async schedule(
    eventType: EventType,
    data: EventData,
    delayMinutes: number
  ): Promise<string> {
    const safeDelayMinutes =
      typeof delayMinutes === 'number' &&
      Number.isFinite(delayMinutes) &&
      delayMinutes >= 0
        ? delayMinutes
        : 0;

    const scheduledFor = new Date(
      Date.now() + safeDelayMinutes * 60 * 1000
    );

    return this.emit(eventType, {
      ...data,
      scheduledFor,
    });
  }

  private getPriorityForEvent(eventType: EventType): number {
    const priorities: Record<EventType, number> = {
      email_opened: 3,
      email_clicked: 8,
      proposal_viewed: 9,
      lead_discovered: 2,
      lead_engaged: 6,
      contract_expiring: 10,
      deal_closed: 5,
      objection_raised: 4,
      interest_shown: 7,
      conversation_stalled: 6,
      ai_response_sent: 1,
      lead_replied: 7,
    };

    return priorities[eventType] ?? DEFAULT_PRIORITY;
  }
}

export const eventEmitter = new EventEmitter();