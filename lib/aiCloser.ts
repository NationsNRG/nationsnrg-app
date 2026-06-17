import { Resend } from 'resend';
import { supabase } from './supabase';
import { aiBrain, type AIMove, type ConversationState } from './aiBrain';
import { eventEmitter } from './eventEmitter';
import {
  generateClosingMessage,
  generateFollowUp,
  generateIntroMessage,
  generateObjectionResponse,
} from './messageGenerator';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];

type LeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type ConversationRow = PublicSchema['Tables']['ai_conversations']['Row'];
type ConversationInsert = PublicSchema['Tables']['ai_conversations']['Insert'];
type ConversationUpdate = PublicSchema['Tables']['ai_conversations']['Update'];
type MessageLogRow = PublicSchema['Tables']['ai_message_log']['Row'];
type MessageLogInsert = PublicSchema['Tables']['ai_message_log']['Insert'];
type HumanInterventionInsert = PublicSchema['Tables']['human_intervention_queue']['Insert'];
type ChannelRow = PublicSchema['Tables']['channels']['Row'];
type ChannelLookupRow = Pick<ChannelRow, 'id' | 'name' | 'priority' | 'is_active'>;
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

type ConversationStage = ConversationState['conversation_stage'];
type Sentiment = ConversationState['sentiment'];
type MessageSender = 'ai' | 'lead';
type OutboundChannel = 'email' | 'sms' | 'linkedin' | 'voice';
type TransportChannel = 'email';

interface MessageHistoryEntry {
  id: string;
  sender: MessageSender;
  message: string;
  createdAt: string;
}

interface DeliveryRequest {
  channel: TransportChannel;
  to: string;
  subject?: string;
  message: string;
}

interface DeliveryResult {
  delivered: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
}

interface LeadContact {
  email: string | null;
}

interface SendMessageParams {
  conversationId: string;
  message: string;
  sender: MessageSender;
  channel: OutboundChannel;
  skipTransport?: boolean;
  bypassThrottle?: boolean;
}

interface ChannelSelection {
  channelName: OutboundChannel;
  contactValue: string | null;
  optOut: boolean;
  priority: number;
}

type ActivityDetails = Record<string, Json>;
type EventMetadata = Record<string, Json | undefined>;

const MIN_AI_MESSAGE_INTERVAL_HOURS = 6;
const DUPLICATE_MESSAGE_WINDOW_MINUTES = 10;
const DEFAULT_NEXT_ACTION_HOURS = 24;
const FOLLOW_UP_BATCH_LIMIT = 100;
const STALLED_CONVERSATION_DAYS = 3;

// =====================================================================
// Pure utility functions
// =====================================================================

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number {
  return isFiniteNumber(value) ? value : 0;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStage(value: unknown): ConversationStage {
  if (
    value === 'intro' ||
    value === 'interest' ||
    value === 'objection' ||
    value === 'closing' ||
    value === 'negotiating' ||
    value === 'closed'
  ) {
    return value;
  }
  return 'intro';
}

function normalizeSentiment(value: unknown): Sentiment {
  if (
    value === 'positive' ||
    value === 'neutral' ||
    value === 'negative' ||
    value === 'angry'
  ) {
    return value;
  }
  return 'neutral';
}

function normalizeOutboundChannel(value: unknown): OutboundChannel | null {
  if (
    value === 'email' ||
    value === 'sms' ||
    value === 'linkedin' ||
    value === 'voice'
  ) {
    return value;
  }
  return null;
}

function toJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}

function buildMetadata(pairs: Record<string, unknown>): ActivityDetails {
  const result: ActivityDetails = {};
  for (const [key, value] of Object.entries(pairs)) {
    result[key] = toJson(value);
  }
  return result;
}

function parseTimestamp(value: string | null): Date | null {
  if (!isNonEmptyString(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursSince(value: string | null): number {
  const parsed = parseTimestamp(value);
  if (!parsed) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - parsed.getTime();
  return diffMs < 0 ? 0 : diffMs / (1000 * 60 * 60);
}

function daysSince(value: string | null): number {
  const parsed = parseTimestamp(value);
  if (!parsed) return 0;
  const diffMs = Date.now() - parsed.getTime();
  return diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// =====================================================================
// Row normalizers
// =====================================================================

function normalizeLead(row: LeadRow): LeadRow {
  return {
    ...row,
    business_name: isNonEmptyString(row.business_name)
      ? row.business_name.trim()
      : 'Unknown Business',
    email: normalizeNullableString(row.email),
    industry: normalizeNullableString(row.industry),
    estimated_savings: normalizeNumber(row.estimated_savings),
    created_at: row.created_at ?? null,
  };
}

function normalizeConversation(row: ConversationRow): ConversationRow {
  return {
    ...row,
    lead_id: row.lead_id,
    conversation_stage: normalizeStage(row.conversation_stage),
    sentiment: normalizeSentiment(row.sentiment),
    objection_count: normalizeNumber(row.objection_count),
    positive_signals: normalizeNumber(row.positive_signals),
    message_count: normalizeNumber(row.message_count),
    last_message: normalizeNullableString(row.last_message),
    last_sender:
      row.last_sender === 'ai' || row.last_sender === 'lead'
        ? row.last_sender
        : null,
    last_contact_at: row.last_contact_at ?? null,
    next_action_at: row.next_action_at ?? null,
    price_mentioned: normalizeBoolean(row.price_mentioned),
  };
}

function normalizeMessageHistoryRow(row: MessageLogRow): MessageHistoryEntry {
  return {
    id: row.id,
    sender: row.sender === 'lead' ? 'lead' : 'ai',
    message: normalizeString(row.message),
    createdAt: row.created_at ?? nowIso(),
  };
}

// =====================================================================
// Database helpers
// =====================================================================

async function logSystemActivity(params: {
  activityType: string;
  leadId?: string | null;
  message: string;
  details?: Record<string, Json>;
  createdAt?: string;
}): Promise<void> {
  const payload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: params.leadId ?? null,
    created_at: params.createdAt ?? nowIso(),
    details: {
      message: params.message,
      ...(params.details ?? {}),
    },
  };

  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

async function emitEventSafely(
  eventType: 'interest_shown' | 'conversation_stalled',
  payload: {
    leadId?: string;
    conversationId?: string;
    metadata?: EventMetadata;
    dedupeKey?: string;
  }
): Promise<void> {
  try {
    const eventPayload: {
      leadId?: string;
      conversationId?: string;
      metadata?: EventMetadata;
      dedupeKey?: string;
    } = {};

    if (isNonEmptyString(payload.leadId)) {
      eventPayload.leadId = payload.leadId;
    }

    if (isNonEmptyString(payload.conversationId)) {
      eventPayload.conversationId = payload.conversationId;
    }

    if (payload.metadata !== undefined) {
      eventPayload.metadata = payload.metadata;
    }

    if (isNonEmptyString(payload.dedupeKey)) {
      eventPayload.dedupeKey = payload.dedupeKey;
    }

    await eventEmitter.emit(eventType, eventPayload);
  } catch (error) {
    await logSystemActivity({
      activityType: 'event_emit_failed',
      leadId: payload.leadId ?? null,
      message: safeErrorMessage(error),
      details: buildMetadata({
        emittedEventType: eventType,
        conversationId: payload.conversationId ?? null,
      }),
    });
  }
}

async function fetchLeadById(leadId: string): Promise<LeadRow | null> {
  const { data, error } = await supabase
    .from('discovered_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'lead_fetch_failed',
      leadId,
      message: error.message,
      details: buildMetadata({ operation: 'fetchLeadById' }),
    });
    return null;
  }

  return data ? normalizeLead(data) : null;
}

async function fetchConversationById(
  conversationId: string
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'conversation_fetch_failed',
      message: error.message,
      details: buildMetadata({
        operation: 'fetchConversationById',
        conversationId,
      }),
    });
    return null;
  }

  return data ? normalizeConversation(data) : null;
}

async function fetchOpenConversationForLead(
  leadId: string
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('lead_id', leadId)
    .neq('conversation_stage', 'closed')
    .order('last_contact_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'open_conversation_fetch_failed',
      leadId,
      message: error.message,
      details: buildMetadata({ operation: 'fetchOpenConversationForLead' }),
    });
    return null;
  }

  return data ? normalizeConversation(data) : null;
}

async function insertConversation(
  payload: ConversationInsert
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'conversation_insert_failed',
      leadId: payload.lead_id ?? null,
      message: error.message,
      details: buildMetadata({ operation: 'insertConversation' }),
    });
    return null;
  }

  if (!data) {
    await logSystemActivity({
      activityType: 'conversation_insert_empty',
      leadId: payload.lead_id ?? null,
      message: 'Conversation insert returned no row',
      details: buildMetadata({ operation: 'insertConversation' }),
    });
    return null;
  }

  return normalizeConversation(data);
}

async function updateConversation(
  conversationId: string,
  payload: ConversationUpdate
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .update(payload)
    .eq('id', conversationId)
    .select('*')
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'conversation_update_failed',
      message: error.message,
      details: buildMetadata({
        operation: 'updateConversation',
        conversationId,
      }),
    });
    return null;
  }

  if (!data) {
    await logSystemActivity({
      activityType: 'conversation_update_empty',
      message: 'Conversation update returned no row',
      details: buildMetadata({
        operation: 'updateConversation',
        conversationId,
      }),
    });
    return null;
  }

  return normalizeConversation(data);
}

async function insertMessageLog(
  payload: MessageLogInsert
): Promise<MessageLogRow | null> {
  const insertPayload: MessageLogInsert = {
    conversation_id: payload.conversation_id,
    message: payload.message,
    sender: payload.sender,
    created_at: payload.created_at ?? nowIso(),
  };

  const { data, error } = await supabase
    .from('ai_message_log')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'message_log_failed',
      message: error.message,
      details: buildMetadata({
        conversationId: payload.conversation_id ?? null,
        sender: payload.sender ?? null,
      }),
    });
    return null;
  }

  if (!data) {
    await logSystemActivity({
      activityType: 'message_log_empty',
      message: 'Message log insert returned no row',
      details: buildMetadata({
        conversationId: payload.conversation_id ?? null,
        sender: payload.sender ?? null,
      }),
    });
    return null;
  }

  return data;
}

async function enqueueHumanIntervention(params: {
  leadId: string | null;
  conversationId: string;
  reason: string;
}): Promise<void> {
  const insertPayload: HumanInterventionInsert = {
    lead_id: params.leadId ?? null,
    ai_conversation_id: params.conversationId,
    reason: params.reason,
    status: 'pending',
    created_at: nowIso(),
  };

  const { error } = await supabase
    .from('human_intervention_queue')
    .insert(insertPayload);

  if (error) {
    await logSystemActivity({
      activityType: 'human_intervention_insert_failed',
      leadId: params.leadId,
      message: error.message,
      details: buildMetadata({
        conversationId: params.conversationId,
        reason: params.reason,
      }),
    });
  }
}

async function incrementMessageCount(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_message_count', {
    row_id: conversationId,
  });

  if (error) {
    await logSystemActivity({
      activityType: 'message_count_increment_failed',
      message: error.message,
      details: buildMetadata({
        operation: 'increment_message_count',
        conversationId,
      }),
    });
  }
}

async function fetchMessageHistory(
  conversationId: string
): Promise<MessageHistoryEntry[]> {
  const { data, error } = await supabase
    .from('ai_message_log')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    await logSystemActivity({
      activityType: 'history_fetch_failed',
      message: error.message,
      details: buildMetadata({
        operation: 'fetchMessageHistory',
        conversationId,
      }),
    });
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeMessageHistoryRow) : [];
}

async function hasRecentDuplicateMessage(
  conversationId: string,
  sender: MessageSender,
  message: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ai_message_log')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('sender', sender)
    .eq('message', message)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await logSystemActivity({
      activityType: 'duplicate_check_failed',
      message: error.message,
      details: buildMetadata({ conversationId, sender }),
    });
    return false;
  }

  if (!data) return false;

  const createdAt = parseTimestamp(data.created_at);
  if (!createdAt) return false;

  const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
  return ageMinutes >= 0 && ageMinutes <= DUPLICATE_MESSAGE_WINDOW_MINUTES;
}

async function fetchPendingConversationIds(now: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id')
    .not('next_action_at', 'is', null)
    .lte('next_action_at', now)
    .neq('conversation_stage', 'closed')
    .order('next_action_at', { ascending: true })
    .limit(FOLLOW_UP_BATCH_LIMIT);

  if (error) {
    await logSystemActivity({
      activityType: 'pending_conversations_fetch_failed',
      message: error.message,
      details: buildMetadata({ operation: 'fetchPendingConversationIds' }),
    });
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((row) => normalizeString(row.id))
        .filter((id) => id.length > 0)
    : [];
}

async function fetchLeadChannelSelections(
  leadId: string
): Promise<ChannelSelection[]> {
  const { data, error } = await supabase
    .from('lead_channels')
    .select('contact_value,opt_out,channel_id')
    .eq('lead_id', leadId);

  if (error) {
    await logSystemActivity({
      activityType: 'lead_channels_fetch_failed',
      leadId,
      message: error.message,
      details: buildMetadata({ operation: 'fetchLeadChannelSelections' }),
    });
    return [];
  }

  if (!Array.isArray(data) || data.length === 0) return [];

  const channelIds = Array.from(
    new Set(
      data
        .map((row) => normalizeNullableString(row.channel_id))
        .filter((value): value is string => value !== null)
    )
  );

  if (channelIds.length === 0) return [];

  const { data: channelRows, error: channelError } = await supabase
    .from('channels')
    .select('id,name,priority,is_active')
    .in('id', channelIds);

  if (channelError) {
    await logSystemActivity({
      activityType: 'channels_fetch_failed',
      leadId,
      message: channelError.message,
      details: buildMetadata({ operation: 'fetchLeadChannelSelections' }),
    });
    return [];
  }

  const channelMap = new Map<string, ChannelLookupRow>();
  if (Array.isArray(channelRows)) {
    for (const row of channelRows) {
      channelMap.set(row.id, row);
    }
  }

  const selections: ChannelSelection[] = [];

  for (const row of data) {
    const channelId = normalizeNullableString(row.channel_id);
    if (!channelId) continue;

    const channel = channelMap.get(channelId);
    if (!channel || channel.is_active !== true) continue;

    const channelName = normalizeOutboundChannel(channel.name);
    if (!channelName) continue;

    selections.push({
      channelName,
      contactValue: normalizeNullableString(row.contact_value),
      optOut: row.opt_out === true,
      priority: normalizeNumber(channel.priority),
    });
  }

  selections.sort((a, b) => a.priority - b.priority);
  return selections;
}

// =====================================================================
// Domain logic
// =====================================================================

function buildConversationState(
  conversation: ConversationRow,
  lead: LeadRow
): ConversationState {
  const normalizedLead = normalizeLead(lead);
  const normalizedConversation = normalizeConversation(conversation);

  return {
    id: normalizedConversation.id,
    lead_id: normalizedLead.id,
    lead_name: normalizedLead.business_name,
    lead_industry: normalizedLead.industry ?? 'general',
    estimated_savings: normalizeNumber(normalizedLead.estimated_savings),
    conversation_stage: normalizeStage(
      normalizedConversation.conversation_stage
    ),
    sentiment: normalizeSentiment(normalizedConversation.sentiment),
    objection_count: normalizeNumber(normalizedConversation.objection_count),
    positive_signals: normalizeNumber(normalizedConversation.positive_signals),
    message_count: normalizeNumber(normalizedConversation.message_count),
    days_since_last_contact: daysSince(normalizedConversation.last_contact_at),
    price_mentioned: normalizeBoolean(normalizedConversation.price_mentioned),
    industry: normalizedLead.industry ?? 'general',
  };
}

function detectInterest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('interested') ||
    lower.includes('how much') ||
    lower.includes('tell me more') ||
    lower.includes('send details') ||
    lower.includes('pricing')
  );
}

function detectObjection(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('not interested') ||
    lower.includes('too expensive') ||
    lower.includes('busy') ||
    lower.includes('already have') ||
    lower.includes('under contract')
  );
}

function analyzeSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();

  if (
    lower.includes('stop') ||
    lower.includes('unsubscribe') ||
    lower.includes('leave me alone')
  ) {
    return 'angry';
  }

  if (
    lower.includes('interested') ||
    lower.includes('how much') ||
    lower.includes('sounds good') ||
    lower.includes('tell me more')
  ) {
    return 'positive';
  }

  if (
    lower.includes('no') ||
    lower.includes('busy') ||
    lower.includes('not now') ||
    lower.includes('too expensive')
  ) {
    return 'negative';
  }

  return 'neutral';
}

// =====================================================================
// Transport
// =====================================================================

class MultiChannelTransport {
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend =
      typeof apiKey === 'string' && apiKey.length > 0
        ? new Resend(apiKey)
        : null;
  }

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    return this.sendEmail(request);
  }

  private async sendEmail(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.resend) {
      return {
        delivered: false,
        providerMessageId: null,
        errorMessage: 'Missing RESEND_API_KEY',
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: 'NationsNRG AI <closer@nationsnrg.com>',
        to: [request.to],
        subject: request.subject ?? 'Re: Your energy savings opportunity',
        html: `<div>${escapeHtml(request.message).replace(/\n/g, '<br>')}</div>`,
      });

      const providerMessageId =
        typeof response.data?.id === 'string' ? response.data.id : null;

      return {
        delivered: response.error == null,
        providerMessageId,
        errorMessage: response.error?.message ?? null,
      };
    } catch (error) {
      return {
        delivered: false,
        providerMessageId: null,
        errorMessage: safeErrorMessage(error),
      };
    }
  }
}

// =====================================================================
// AICloser
// =====================================================================

class AICloser {
  private readonly transport = new MultiChannelTransport();

  async startConversation(leadId: string): Promise<ConversationRow | null> {
    const lead = await fetchLeadById(leadId);
    if (!lead) return null;

    const contact: LeadContact = {
      email: normalizeNullableString(lead.email),
    };

    if (!contact.email) {
      await logSystemActivity({
        activityType: 'conversation_start_skipped',
        leadId,
        message: 'Lead has no email contact',
        details: buildMetadata({ channel: 'email' }),
      });
      return null;
    }

    const existingOpenConversation =
      await fetchOpenConversationForLead(leadId);
    if (existingOpenConversation) return existingOpenConversation;

    const insertPayload: ConversationInsert = {
      lead_id: leadId,
      conversation_stage: 'intro',
      sentiment: 'neutral',
      objection_count: 0,
      positive_signals: 0,
      message_count: 0,
      next_action_at: nowIso(),
      last_contact_at: null,
      price_mentioned: false,
    };

    const conversation = await insertConversation(insertPayload);
    if (!conversation) return null;

    const introMessage = generateIntroMessage(lead);
    await this.sendMessage({
      conversationId: conversation.id,
      message: introMessage,
      sender: 'ai',
      channel: 'email',
    });

    return await fetchConversationById(conversation.id);
  }

  async handleReply(
    conversationId: string,
    replyText: string
  ): Promise<void> {
    const conversation = await fetchConversationById(conversationId);
    if (!conversation) return;

    const leadId = normalizeNullableString(conversation.lead_id);
    if (!leadId) {
      await logSystemActivity({
        activityType: 'reply_processing_skipped',
        message: 'Conversation has no lead_id',
        details: buildMetadata({ conversationId }),
      });
      return;
    }

    const lead = await fetchLeadById(leadId);
    if (!lead) return;

    const normalizedReply = normalizeString(replyText);
    if (normalizedReply.length === 0) {
      await logSystemActivity({
        activityType: 'reply_ignored',
        leadId,
        message: 'Empty reply text',
        details: buildMetadata({ conversationId }),
      });
      return;
    }

    await this.sendMessage({
      conversationId,
      message: normalizedReply,
      sender: 'lead',
      channel: 'email',
      skipTransport: true,
    });

    const sentiment = analyzeSentiment(normalizedReply);
    const objectionDetected = detectObjection(normalizedReply);
    const interestDetected = detectInterest(normalizedReply);

    const currentObjectionCount = normalizeNumber(
      conversation.objection_count
    );
    const currentPositiveSignals = normalizeNumber(
      conversation.positive_signals
    );
    const currentStage = normalizeStage(conversation.conversation_stage);

    const nextStage: ConversationStage = objectionDetected
      ? 'objection'
      : interestDetected
      ? 'interest'
      : currentStage;

    const updatedConversation = await updateConversation(conversationId, {
      last_message: normalizedReply,
      last_sender: 'lead',
      sentiment,
      last_contact_at: nowIso(),
      objection_count: objectionDetected
        ? currentObjectionCount + 1
        : currentObjectionCount,
      positive_signals: interestDetected
        ? currentPositiveSignals + 1
        : currentPositiveSignals,
      conversation_stage: nextStage,
    });

    if (!updatedConversation) return;

    if (interestDetected) {
      await emitEventSafely('interest_shown', {
        leadId: lead.id,
        conversationId,
        dedupeKey: `interest_shown:${conversationId}:${normalizedReply.toLowerCase()}`,
        metadata: buildMetadata({
          reply: normalizedReply,
          sentiment,
          stage: nextStage,
        }),
      });
    }

    const refreshedConversation =
      (await fetchConversationById(conversationId)) ?? updatedConversation;

    const state = buildConversationState(refreshedConversation, lead);

    if (state.days_since_last_contact > STALLED_CONVERSATION_DAYS) {
      await emitEventSafely('conversation_stalled', {
        conversationId,
        leadId: lead.id,
        dedupeKey: `conversation_stalled:${conversationId}:${state.days_since_last_contact}`,
        metadata: buildMetadata({
          days: state.days_since_last_contact,
          stage: state.conversation_stage,
        }),
      });
    }

    const history = await fetchMessageHistory(conversationId);
    const move = await aiBrain.decideNextMove(state, history);

    await this.executeMove(conversationId, move, lead, state);
  }

  async processPendingConversations(): Promise<void> {
    const now = nowIso();
    const conversationIds = await fetchPendingConversationIds(now);

    for (const conversationId of conversationIds) {
      await this.handleFollowUp(conversationId);
    }
  }

  async sendMultiChannel(
    leadId: string,
    message: string,
    priority: OutboundChannel[] = ['email', 'sms', 'linkedin']
  ): Promise<void> {
    const lead = await fetchLeadById(leadId);
    if (!lead) return;

    const conversation =
      (await fetchOpenConversationForLead(leadId)) ??
      (await this.startConversation(leadId));

    if (!conversation) return;

    const selections = await fetchLeadChannelSelections(leadId);
    const selectionMap = new Map<OutboundChannel, ChannelSelection>();

    for (const selection of selections) {
      if (!selectionMap.has(selection.channelName)) {
        selectionMap.set(selection.channelName, selection);
      }
    }

    for (const channel of priority) {
      if (channel === 'email') {
        const email = normalizeNullableString(lead.email);
        if (!email) continue;

        await this.sendMessage({
          conversationId: conversation.id,
          message,
          sender: 'ai',
          channel: 'email',
        });
        return;
      }

      const selection = selectionMap.get(channel);
      if (!selection || selection.optOut) continue;

      const contactValue = normalizeNullableString(selection.contactValue);
      if (!contactValue) continue;

      if (channel === 'sms') {
        const { smsCloser } = await import('./smsCloser');
        const result = await smsCloser.sendMessage(contactValue, message);

        if (result.success) {
          await this.sendMessage({
            conversationId: conversation.id,
            message,
            sender: 'ai',
            channel: 'sms',
            skipTransport: true,
          });
          return;
        }

        await logSystemActivity({
          activityType: 'multichannel_sms_failed',
          leadId,
          message: result.error,
          details: buildMetadata({ conversationId: conversation.id }),
        });
        continue;
      }

      if (channel === 'linkedin') {
        const { linkedinCloser } = await import('./linkedinCloser');
        const result = await linkedinCloser.sendMessage(contactValue, message);

        if (result.success) {
          await this.sendMessage({
            conversationId: conversation.id,
            message,
            sender: 'ai',
            channel: 'linkedin',
            skipTransport: true,
          });
          return;
        }

        await logSystemActivity({
          activityType: 'multichannel_linkedin_failed',
          leadId,
          message: result.error,
          details: buildMetadata({ conversationId: conversation.id }),
        });
      }
    }

    const fallbackEmail = normalizeNullableString(lead.email);
    if (fallbackEmail) {
      await this.sendMessage({
        conversationId: conversation.id,
        message,
        sender: 'ai',
        channel: 'email',
      });
    }
  }

  private async handleFollowUp(conversationId: string): Promise<void> {
    const conversation = await fetchConversationById(conversationId);
    if (!conversation) return;

    if (normalizeStage(conversation.conversation_stage) === 'closed') return;

    const leadId = normalizeNullableString(conversation.lead_id);
    if (!leadId) {
      await logSystemActivity({
        activityType: 'followup_skipped',
        message: 'Conversation has no lead_id',
        details: buildMetadata({ conversationId }),
      });
      return;
    }

    const lead = await fetchLeadById(leadId);
    if (!lead) return;

    const state = buildConversationState(conversation, lead);

    if (state.days_since_last_contact > STALLED_CONVERSATION_DAYS) {
      await emitEventSafely('conversation_stalled', {
        conversationId,
        leadId: lead.id,
        dedupeKey: `conversation_stalled:${conversationId}:${state.days_since_last_contact}`,
        metadata: buildMetadata({
          days: state.days_since_last_contact,
          stage: state.conversation_stage,
        }),
      });
    }

    const message = generateFollowUp(lead, {
      daysSince: state.days_since_last_contact,
      stage: state.conversation_stage,
      sentiment: state.sentiment,
    });

    await this.sendMessage({
      conversationId,
      message,
      sender: 'ai',
      channel: 'email',
    });
  }

  private async executeMove(
    conversationId: string,
    move: AIMove,
    lead: LeadRow,
    state: ConversationState
  ): Promise<void> {
    if (move.type === 'escalate_to_human') {
      await enqueueHumanIntervention({
        leadId: lead.id,
        conversationId,
        reason: move.reason,
      });

      await updateConversation(conversationId, {
        next_action_at: null,
      });

      return;
    }

    let outboundMessage = '';

    if (move.type === 'soften' || move.type === 'educate') {
      outboundMessage = move.message;
    } else if (move.type === 'push_close') {
      outboundMessage = generateClosingMessage(lead);
    } else if (move.type === 'handle_objection') {
      outboundMessage = generateObjectionResponse(move.objection, lead);
    } else {
      outboundMessage = generateFollowUp(lead, {
        daysSince: state.days_since_last_contact,
        stage: state.conversation_stage,
        sentiment: state.sentiment,
      });
    }

    await this.sendMessage({
      conversationId,
      message: outboundMessage,
      sender: 'ai',
      channel: 'email',
      bypassThrottle: true,
    });

    const timingHours = clamp(
      normalizeNumber(
        'timing' in move
          ? move.timing ?? DEFAULT_NEXT_ACTION_HOURS
          : DEFAULT_NEXT_ACTION_HOURS
      ),
      1,
      24 * 30
    );

    const nextActionAt = new Date(
      Date.now() + timingHours * 60 * 60 * 1000
    ).toISOString();

    await updateConversation(conversationId, {
      next_action_at: nextActionAt,
    });
  }

  private async sendMessage(params: SendMessageParams): Promise<void> {
    const normalizedMessage = normalizeString(params.message);
    if (normalizedMessage.length === 0) {
      await logSystemActivity({
        activityType: 'message_send_skipped',
        message: 'Empty message',
        details: buildMetadata({
          conversationId: params.conversationId,
          sender: params.sender,
          channel: params.channel,
        }),
      });
      return;
    }

    const conversation = await fetchConversationById(params.conversationId);
    if (!conversation) return;

    const leadId = normalizeNullableString(conversation.lead_id);
    if (!leadId) {
      await logSystemActivity({
        activityType: 'message_send_skipped',
        message: 'Conversation has no lead_id',
        details: buildMetadata({
          conversationId: params.conversationId,
          sender: params.sender,
          channel: params.channel,
        }),
      });
      return;
    }

    const lead = await fetchLeadById(leadId);
    if (!lead) return;

    if (params.sender === 'ai' && !params.bypassThrottle) {
      const recentHours = hoursSince(conversation.last_contact_at);
      if (recentHours < MIN_AI_MESSAGE_INTERVAL_HOURS) {
        await logSystemActivity({
          activityType: 'message_send_throttled',
          leadId,
          message: `AI message throttled (${recentHours.toFixed(2)} hours since last contact)`,
          details: buildMetadata({
            conversationId: params.conversationId,
            channel: params.channel,
          }),
        });
        return;
      }
    }

    const duplicate = await hasRecentDuplicateMessage(
      params.conversationId,
      params.sender,
      normalizedMessage
    );

    if (duplicate) {
      await logSystemActivity({
        activityType: 'message_send_deduplicated',
        leadId,
        message: 'Duplicate message suppressed',
        details: buildMetadata({
          conversationId: params.conversationId,
          sender: params.sender,
          channel: params.channel,
        }),
      });
      return;
    }

    if (!params.skipTransport && params.sender === 'ai') {
      if (params.channel !== 'email') {
        await logSystemActivity({
          activityType: 'message_delivery_skipped',
          leadId,
          message: 'Transport not supported for channel',
          details: buildMetadata({
            conversationId: params.conversationId,
            channel: params.channel,
          }),
        });
        return;
      }

      const email = normalizeNullableString(lead.email);
      if (!email) {
        await logSystemActivity({
          activityType: 'message_delivery_skipped',
          leadId,
          message: 'No contact destination for outbound delivery',
          details: buildMetadata({
            conversationId: params.conversationId,
            channel: params.channel,
          }),
        });
        return;
      }

      const delivery = await this.transport.send({
        channel: 'email',
        to: email,
        subject: 'Re: Your energy savings opportunity',
        message: normalizedMessage,
      });

      if (!delivery.delivered) {
        await logSystemActivity({
          activityType: 'message_delivery_failed',
          leadId,
          message: delivery.errorMessage ?? 'Unknown delivery failure',
          details: buildMetadata({
            conversationId: params.conversationId,
            channel: params.channel,
          }),
        });
        return;
      }
    }

    const insertedLog = await insertMessageLog({
      conversation_id: params.conversationId,
      message: normalizedMessage,
      sender: params.sender,
      created_at: nowIso(),
    });

    if (!insertedLog) return;

    await incrementMessageCount(params.conversationId);

    await updateConversation(params.conversationId, {
      last_message: normalizedMessage,
      last_sender: params.sender,
      last_contact_at: insertedLog.created_at ?? nowIso(),
    });
  }
}

export const aiCloser = new AICloser();