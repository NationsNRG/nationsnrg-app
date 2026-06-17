import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eventEmitter, type EventType } from './eventEmitter';
import { aiCloser } from './aiCloser';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];
type DbSystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

type EventQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter';

type ConversationStage =
  | 'intro'
  | 'interest'
  | 'objection'
  | 'closing'
  | 'negotiating'
  | 'closed';

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
  processed_at?: string | null;
  retry_count?: number;
  last_error?: string | null;
  scheduled_for?: string;
  updated_at?: string;
}

interface EventLogInsert {
  event_id: string;
  action_taken: string;
  result: string;
  details: Json;
  created_at: string;
}

interface NotificationInsert {
  type: string;
  lead_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface AIConversationRow {
  id: string;
  lead_id: string;
  conversation_stage: string | null;
  positive_signals: number | null;
}

interface AIConversationUpdate {
  conversation_stage?: ConversationStage;
  positive_signals?: number;
}

interface ParsedEventData {
  leadId: string | null;
  conversationId: string | null;
  emailId: string | null;
  metadata: Record<string, Json | undefined>;
}

type EventHandler = (
  event: EventQueueRow,
  data: ParsedEventData
) => Promise<void>;

const DEFAULT_RETRY_DELAY_MINUTES = 5;
const DEFAULT_MAX_RETRIES = 3;

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

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isJsonObject(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toJsonObject(value: Record<string, Json | undefined>): Json {
  return value;
}

function buildActivityDetails(
  message: string,
  details?: Record<string, Json | undefined>
): Json {
  return {
    message,
    ...(details ?? {}),
  };
}

function parseEventData(value: Json): ParsedEventData {
  if (!isJsonObject(value)) {
    return {
      leadId: null,
      conversationId: null,
      emailId: null,
      metadata: {},
    };
  }

  const topLeadId = normalizeNullableString(value.leadId);
  const topConversationId = normalizeNullableString(value.conversationId);
  const topEmailId = normalizeNullableString(value.emailId);
  const nestedMetadata = isJsonObject(value.metadata) ? value.metadata : {};

  const metadataLeadId = normalizeNullableString(nestedMetadata.leadId);
  const metadataConversationId = normalizeNullableString(
    nestedMetadata.conversationId
  );
  const metadataEmailId = normalizeNullableString(nestedMetadata.emailId);

  return {
    leadId: topLeadId ?? metadataLeadId,
    conversationId: topConversationId ?? metadataConversationId,
    emailId: topEmailId ?? metadataEmailId,
    metadata: nestedMetadata,
  };
}

function buildEntityId(event: EventQueueRow, data: ParsedEventData): string {
  return data.conversationId ?? data.leadId ?? event.id;
}

function isEventQueueRow(value: unknown): value is EventQueueRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.trim().length > 0;
}

function isAIConversationRow(value: unknown): value is AIConversationRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate.lead_id === 'string' &&
    candidate.lead_id.trim().length > 0
  );
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: DbSystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

async function logEventAction(
  supabase: SupabaseClient,
  eventId: string,
  action: string,
  result: string,
  details: Json
): Promise<void> {
  const payload: EventLogInsert = {
    event_id: eventId,
    action_taken: action,
    result,
    details,
    created_at: nowIso(),
  };

  const { error } = await supabase.from('event_log').insert(payload);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'event_log_insert_failed',
      lead_id: null,
      details: buildActivityDetails(error.message, {
        eventId,
        action,
        result,
      }),
      created_at: nowIso(),
    });
  }
}

async function updateEventStatus(
  supabase: SupabaseClient,
  eventId: string,
  payload: EventQueueUpdate
): Promise<void> {
  const updatePayload: EventQueueUpdate = {
    ...payload,
    updated_at: nowIso(),
  };

  const { error } = await supabase
    .from('event_queue')
    .update(updatePayload)
    .eq('id', eventId);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'event_status_update_failed',
      lead_id: null,
      details: buildActivityDetails(error.message, {
        eventId,
        status: updatePayload.status ?? null,
      }),
      created_at: nowIso(),
    });
  }
}

async function fetchConversationByLeadId(
  supabase: SupabaseClient,
  leadId: string
): Promise<AIConversationRow | null> {
  if (normalizeString(leadId).length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, lead_id, conversation_stage, positive_signals')
    .eq('lead_id', leadId)
    .neq('conversation_stage', 'closed')
    .limit(1);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'conversation_lookup_failed',
      lead_id: leadId,
      details: buildActivityDetails(error.message, {
        operation: 'fetchConversationByLeadId',
      }),
      created_at: nowIso(),
    });
    return null;
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return isAIConversationRow(row) ? row : null;
}

async function fetchConversationById(
  supabase: SupabaseClient,
  conversationId: string
): Promise<AIConversationRow | null> {
  if (normalizeString(conversationId).length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, lead_id, conversation_stage, positive_signals')
    .eq('id', conversationId)
    .limit(1);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'conversation_lookup_failed',
      lead_id: null,
      details: buildActivityDetails(error.message, {
        operation: 'fetchConversationById',
        conversationId,
      }),
      created_at: nowIso(),
    });
    return null;
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return isAIConversationRow(row) ? row : null;
}

async function updateConversation(
  supabase: SupabaseClient,
  conversationId: string,
  payload: AIConversationUpdate
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update(payload)
    .eq('id', conversationId);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'conversation_update_failed',
      lead_id: null,
      details: buildActivityDetails(error.message, {
        conversationId,
        conversationStage: payload.conversation_stage ?? null,
        positiveSignals: payload.positive_signals ?? null,
      }),
      created_at: nowIso(),
    });
  }
}

async function insertNotification(
  supabase: SupabaseClient,
  payload: NotificationInsert
): Promise<void> {
  const { error } = await supabase.from('notifications').insert(payload);

  if (error) {
    await logSystemActivity(supabase, {
      activity_type: 'notification_insert_failed',
      lead_id: payload.lead_id,
      details: buildActivityDetails(error.message, {
        title: payload.title,
        type: payload.type,
      }),
      created_at: nowIso(),
    });
  }
}

class EventHandlers {
  private readonly supabase: SupabaseClient;
  private readonly handlers: Map<EventType, EventHandler>;

  constructor() {
    this.supabase = getSupabaseClient();
    this.handlers = new Map<EventType, EventHandler>();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('email_opened', this.handleEmailOpened.bind(this));
    this.handlers.set('email_clicked', this.handleEmailClicked.bind(this));
    this.handlers.set('proposal_viewed', this.handleProposalViewed.bind(this));
    this.handlers.set('lead_engaged', this.handleLeadEngaged.bind(this));
    this.handlers.set('interest_shown', this.handleInterestShown.bind(this));
    this.handlers.set(
      'conversation_stalled',
      this.handleConversationStalled.bind(this)
    );
    this.handlers.set(
      'contract_expiring',
      this.handleContractExpiring.bind(this)
    );
    this.handlers.set('lead_discovered', this.handleLeadDiscovered.bind(this));
    this.handlers.set('lead_replied', this.handleLeadReplied.bind(this));
    this.handlers.set('ai_response_sent', this.handleAIResponseSent.bind(this));
    this.handlers.set('objection_raised', this.handleObjectionRaised.bind(this));
    this.handlers.set('deal_closed', this.handleDealClosed.bind(this));
  }

  async processEvent(event: EventQueueRow): Promise<void> {
    const eventType = this.normalizeEventType(event.event_type);
    const parsedData = parseEventData(event.event_data);

    if (eventType === null) {
      await logSystemActivity(this.supabase, {
        activity_type: 'event_handler_missing',
        lead_id: parsedData.leadId,
        details: buildActivityDetails(
          `Unsupported event type: ${event.event_type}`,
          {
            eventId: event.id,
          }
        ),
        created_at: nowIso(),
      });

      await logEventAction(
        this.supabase,
        event.id,
        'missing_handler',
        'failed',
        toJsonObject({
          eventType: event.event_type,
        })
      );

      await updateEventStatus(this.supabase, event.id, {
        status: 'failed',
        processed_at: nowIso(),
        last_error: `Unsupported event type: ${event.event_type}`,
      });

      return;
    }

    const handler = this.handlers.get(eventType);

    if (!handler) {
      await logSystemActivity(this.supabase, {
        activity_type: 'event_handler_missing',
        lead_id: parsedData.leadId,
        details: buildActivityDetails(
          `No handler registered for: ${eventType}`,
          {
            eventId: event.id,
          }
        ),
        created_at: nowIso(),
      });

      await updateEventStatus(this.supabase, event.id, {
        status: 'failed',
        processed_at: nowIso(),
        last_error: `No handler registered for: ${eventType}`,
      });

      return;
    }

    try {
      await handler(event, parsedData);

      await updateEventStatus(this.supabase, event.id, {
        status: 'completed',
        processed_at: nowIso(),
        last_error: null,
      });
    } catch (error) {
      const retryCount = normalizeNumber(event.retry_count) + 1;
      const maxRetries = Math.max(
        DEFAULT_MAX_RETRIES,
        normalizeNumber(event.max_retries)
      );
      const terminal = retryCount >= maxRetries;
      const nextStatus: EventQueueStatus = terminal ? 'failed' : 'pending';

      await logSystemActivity(this.supabase, {
        activity_type: 'event_processing_failed',
        lead_id: parsedData.leadId,
        details: buildActivityDetails(safeErrorMessage(error), {
          entityId: buildEntityId(event, parsedData),
          eventId: event.id,
          eventType,
          retryCount,
          maxRetries,
          willRetry: !terminal,
        }),
        created_at: nowIso(),
      });

      await logEventAction(
        this.supabase,
        event.id,
        'process_event',
        'failed',
        toJsonObject({
          error: safeErrorMessage(error),
          retryCount,
          maxRetries,
          nextStatus,
        })
      );

      await updateEventStatus(this.supabase, event.id, {
        status: nextStatus,
        retry_count: retryCount,
        last_error: safeErrorMessage(error),
        processed_at: terminal ? nowIso() : null,
        scheduled_for: terminal
          ? event.scheduled_for
          : new Date(
              Date.now() + DEFAULT_RETRY_DELAY_MINUTES * 60 * 1000
            ).toISOString(),
      });
    }
  }

  private async handleEmailOpened(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.leadId) {
      await eventEmitter.schedule(
        'lead_engaged',
        {
          leadId: data.leadId,
          conversationId: data.conversationId ?? undefined,
          dedupeKey: `lead_engaged:${data.leadId}:${event.id}`,
          metadata: {
            sourceEventId: event.id,
            sourceEventType: event.event_type,
            emailId: data.emailId,
          },
        },
        6 * 60
      );
    }

    await logEventAction(
      this.supabase,
      event.id,
      'email_opened_tracked',
      'success',
      toJsonObject({
        leadId: data.leadId,
        emailId: data.emailId,
      })
    );
  }

  private async handleEmailClicked(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.conversationId) {
      await aiCloser.handleReply(
        data.conversationId,
        'I clicked your link - tell me more'
      );
    }

    await logEventAction(
      this.supabase,
      event.id,
      'clicked_triggered',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
        emailId: data.emailId,
      })
    );
  }

  private async handleProposalViewed(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.conversationId) {
      await updateConversation(this.supabase, data.conversationId, {
        conversation_stage: 'closing',
      });
    }

    if (data.leadId) {
      await eventEmitter.schedule(
        'lead_engaged',
        {
          leadId: data.leadId,
          conversationId: data.conversationId ?? undefined,
          dedupeKey: `proposal_followup:${data.leadId}:${event.id}`,
          metadata: {
            sourceEventId: event.id,
            sourceEventType: event.event_type,
          },
        },
        24 * 60
      );
    }

    await logEventAction(
      this.supabase,
      event.id,
      'proposal_viewed_escalated',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private async handleLeadEngaged(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (!data.leadId) {
      await logEventAction(
        this.supabase,
        event.id,
        'lead_engagement_triggered',
        'skipped',
        toJsonObject({
          reason: 'missing_lead_id',
        })
      );
      return;
    }

    const existingConversation = await fetchConversationByLeadId(
      this.supabase,
      data.leadId
    );

    if (!existingConversation) {
      await aiCloser.startConversation(data.leadId);
    }

    await logEventAction(
      this.supabase,
      event.id,
      'lead_engagement_triggered',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationStarted: existingConversation === null,
      })
    );
  }

  private async handleInterestShown(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.conversationId) {
      const conversation = await fetchConversationById(
        this.supabase,
        data.conversationId
      );

      const existingSignals = conversation
        ? normalizeNumber(conversation.positive_signals)
        : 0;

      await updateConversation(this.supabase, data.conversationId, {
        conversation_stage: 'closing',
        positive_signals: existingSignals + 1,
      });
    }

    await eventEmitter.schedule(
      'ai_response_sent',
      {
        leadId: data.leadId ?? undefined,
        conversationId: data.conversationId ?? undefined,
        dedupeKey: `ai_response_sent:${data.conversationId ?? data.leadId ?? event.id}:${event.id}`,
        metadata: {
          sourceEventId: event.id,
          sourceEventType: event.event_type,
        },
      },
      6
    );

    await logEventAction(
      this.supabase,
      event.id,
      'interest_shown_triggered',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private async handleConversationStalled(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.conversationId) {
      await aiCloser.handleReply(data.conversationId, 'Hey, just checking in...');
    }

    await logEventAction(
      this.supabase,
      event.id,
      'stalled_triggered',
      'success',
      toJsonObject({
        conversationId: data.conversationId,
      })
    );
  }

  private async handleContractExpiring(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    if (data.leadId) {
      await insertNotification(this.supabase, {
        type: 'urgent',
        lead_id: data.leadId,
        title: '⚠️ Contract Expiring Soon',
        message: 'Lead is high priority - immediate action needed',
        read: false,
        created_at: nowIso(),
      });
    }

    await logEventAction(
      this.supabase,
      event.id,
      'expiring_alert_sent',
      'success',
      toJsonObject({
        leadId: data.leadId,
      })
    );
  }

  private async handleLeadDiscovered(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    await logEventAction(
      this.supabase,
      event.id,
      'lead_discovered_received',
      'success',
      toJsonObject({
        leadId: data.leadId,
      })
    );
  }

  private async handleLeadReplied(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    await logEventAction(
      this.supabase,
      event.id,
      'lead_replied_received',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private async handleAIResponseSent(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    await logEventAction(
      this.supabase,
      event.id,
      'ai_response_sent_received',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private async handleObjectionRaised(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    await logEventAction(
      this.supabase,
      event.id,
      'objection_raised_received',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private async handleDealClosed(
    event: EventQueueRow,
    data: ParsedEventData
  ): Promise<void> {
    await logEventAction(
      this.supabase,
      event.id,
      'deal_closed_received',
      'success',
      toJsonObject({
        leadId: data.leadId,
        conversationId: data.conversationId,
      })
    );
  }

  private normalizeEventType(value: string): EventType | null {
    const normalized = normalizeString(value);

    if (normalized === 'email_opened') return normalized;
    if (normalized === 'email_clicked') return normalized;
    if (normalized === 'proposal_viewed') return normalized;
    if (normalized === 'lead_discovered') return normalized;
    if (normalized === 'lead_engaged') return normalized;
    if (normalized === 'contract_expiring') return normalized;
    if (normalized === 'deal_closed') return normalized;
    if (normalized === 'objection_raised') return normalized;
    if (normalized === 'interest_shown') return normalized;
    if (normalized === 'conversation_stalled') return normalized;
    if (normalized === 'ai_response_sent') return normalized;
    if (normalized === 'lead_replied') return normalized;

    return null;
  }
}

export const eventHandlers = new EventHandlers();