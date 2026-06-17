import twilio, { Twilio } from 'twilio';
import { supabase } from './supabase';
import { generateIntroMessage } from './messageGenerator';
import { eventEmitter } from './eventEmitter';
import type { Database } from '@/types/supabase';

type PublicSchema = Database['public'];
type LeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type AiConversationRow = PublicSchema['Tables']['ai_conversations']['Row'];
type AiConversationInsert = PublicSchema['Tables']['ai_conversations']['Insert'];
type LeadChannelRow = PublicSchema['Tables']['lead_channels']['Row'];
type LeadChannelInsert = PublicSchema['Tables']['lead_channels']['Insert'];
type LeadChannelUpdate = PublicSchema['Tables']['lead_channels']['Update'];
type ChannelRow = PublicSchema['Tables']['channels']['Row'];
type ChannelConversationRow = PublicSchema['Tables']['channel_conversations']['Row'];
type ChannelConversationInsert = PublicSchema['Tables']['channel_conversations']['Insert'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

const SMS_CHANNEL_NAME = 'sms';
const CONVERSATION_STAGE_INTRO = 'intro';
const SENTIMENT_NEUTRAL = 'neutral';

export interface SMSContext {
    leadId: string;
    phoneNumber: string;
    conversationId: string;
    messageHistory: ReadonlyArray<unknown>;
}

interface SendMessageSuccess {
    success: true;
    sid: string;
}

interface SendMessageFailure {
    success: false;
    error: string;
}

type SendMessageResult = SendMessageSuccess | SendMessageFailure;

interface StartConversationResult {
    conversationId: string;
    wasCreated: boolean;
}

interface ExistingConversationLookup {
    conversationId: string;
}

interface HandleReplyDependencies {
    aiCloser: {
        handleReply: (conversationId: string, replyText: string) => Promise<void>;
    };
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.trim();
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && isNonEmptyString(error.message)) {
        return error.message;
    }

    return 'Unknown error';
}

function requireEnv(name: string): string {
    const value = process.env[name];

    if (!isNonEmptyString(value)) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

function isLeadRow(value: unknown): value is LeadRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return isNonEmptyString(candidate.id);
}

function isAiConversationRow(value: unknown): value is AiConversationRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return isNonEmptyString(candidate.id);
}

function isChannelRow(value: unknown): value is ChannelRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return isNonEmptyString(candidate.id);
}

function isLeadChannelRow(value: unknown): value is LeadChannelRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return isNonEmptyString(candidate.id) && isNonEmptyString(candidate.lead_id) && isNonEmptyString(candidate.channel_id);
}

function isChannelConversationRow(value: unknown): value is ChannelConversationRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        isNonEmptyString(candidate.id) &&
        isNonEmptyString(candidate.lead_id) &&
        isNonEmptyString(candidate.channel_id) &&
        isNonEmptyString(candidate.ai_conversation_id)
    );
}

function normalizeConversationId(row: ChannelConversationRow): ExistingConversationLookup {
    return {
        conversationId: row.ai_conversation_id,
    };
}

async function logSystemActivity(
  activityType: string,
  leadId: string | null,
  message: string
): Promise<void> {
const payload: SystemActivityInsert = {
  activity_type: activityType,
  lead_id: leadId,
  details: {
  message,
},
  created_at: new Date().toISOString(),
};

    const { error } = await supabase.from('system_activity').insert(payload);

    if (error) {
    console.error('Failed to log system activity', {
        activityType,
        leadId,
        message,
        error: error.message,
    });
    }
}

let cachedTwilioClient: Twilio | null = null;

function getTwilioClient(): Twilio {
    if (cachedTwilioClient !== null) {
        return cachedTwilioClient;
    }

    const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
    const authToken = requireEnv('TWILIO_AUTH_TOKEN');

    cachedTwilioClient = twilio(accountSid, authToken);
    return cachedTwilioClient;
}

async function getSMSChannelRow(): Promise<ChannelRow> {
    const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('name', SMS_CHANNEL_NAME)
        .maybeSingle();

    if (error) {
        await logSystemActivity('sms_channel_lookup_failed', SMS_CHANNEL_NAME, error.message);
        throw new Error(`Failed to load SMS channel: ${error.message}`);
    }

    if (!isChannelRow(data)) {
        await logSystemActivity('sms_channel_missing', SMS_CHANNEL_NAME, 'SMS channel is not configured');
        throw new Error('SMS channel is not configured');
    }

    if (data.is_active !== true) {
        await logSystemActivity('sms_channel_inactive', data.id, 'SMS channel is inactive');
        throw new Error('SMS channel is inactive');
    }

    return data;
}

async function getLeadById(leadId: string): Promise<LeadRow> {
    const { data, error } = await supabase
        .from('discovered_leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

    if (error) {
        await logSystemActivity('lead_lookup_failed', leadId, error.message);
        throw new Error(`Failed to load lead: ${error.message}`);
    }

    if (!isLeadRow(data)) {
        await logSystemActivity('lead_not_found', leadId, 'Lead not found');
        throw new Error('Lead not found');
    }

    return data;
}

async function getExistingChannelConversation(
    leadId: string,
    channelId: string
): Promise<ExistingConversationLookup | null> {
    const { data, error } = await supabase
        .from('channel_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        await logSystemActivity('channel_conversation_lookup_failed', leadId, error.message);
        throw new Error(`Failed to load channel conversation: ${error.message}`);
    }

    if (!isChannelConversationRow(data)) {
        return null;
    }

    return normalizeConversationId(data);
}

async function createAiConversation(leadId: string): Promise<AiConversationRow> {
    const payload: AiConversationInsert = {
        lead_id: leadId,
        conversation_stage: CONVERSATION_STAGE_INTRO,
        sentiment: SENTIMENT_NEUTRAL,
        channel: SMS_CHANNEL_NAME,
    };

    const { data, error } = await supabase
        .from('ai_conversations')
        .insert(payload)
        .select('*')
        .maybeSingle();

    if (error) {
        await logSystemActivity('ai_conversation_create_failed', leadId, error.message);
        throw new Error(`Failed to create AI conversation: ${error.message}`);
    }

    if (!isAiConversationRow(data)) {
        await logSystemActivity('ai_conversation_create_invalid', leadId, 'AI conversation insert returned no row');
        throw new Error('Failed to create AI conversation');
    }

    return data;
}

async function upsertLeadChannel(
    leadId: string,
    channelId: string,
    phoneNumber: string,
    lastEngagedAtIso: string
): Promise<void> {
    const payload: LeadChannelInsert = {
        lead_id: leadId,
        channel_id: channelId,
        contact_value: phoneNumber,
        last_engaged_at: lastEngagedAtIso,
        opt_out: false,
    };

    const { error } = await supabase
        .from('lead_channels')
        .upsert(payload, {
            onConflict: 'lead_id,channel_id',
        });

    if (error) {
        await logSystemActivity('lead_channel_upsert_failed', leadId, error.message);
        throw new Error(`Failed to upsert lead channel: ${error.message}`);
    }
}

async function createChannelConversationLink(
    leadId: string,
    channelId: string,
    aiConversationId: string
): Promise<void> {
    const payload: ChannelConversationInsert = {
        lead_id: leadId,
        channel_id: channelId,
        ai_conversation_id: aiConversationId,
    };

    const { error } = await supabase
        .from('channel_conversations')
        .insert(payload);

    if (error) {
        await logSystemActivity('channel_conversation_create_failed', leadId, error.message);
        throw new Error(`Failed to create channel conversation: ${error.message}`);
    }
}

async function findLeadChannelByPhone(phoneNumber: string, channelId: string): Promise<LeadChannelRow | null> {
    const { data, error } = await supabase
        .from('lead_channels')
        .select('*')
        .eq('contact_value', phoneNumber)
        .eq('channel_id', channelId)
        .eq('opt_out', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        await logSystemActivity('lead_channel_phone_lookup_failed', phoneNumber, error.message);
        throw new Error(`Failed to load lead channel by phone number: ${error.message}`);
    }

    if (!isLeadChannelRow(data)) {
        return null;
    }

    return data;
}

async function updateLeadChannelEngagement(leadId: string, channelId: string, lastEngagedAtIso: string): Promise<void> {
    const updatePayload: LeadChannelUpdate = {
        last_engaged_at: lastEngagedAtIso,
    };

    const { data, error } = await supabase
        .from('lead_channels')
        .update(updatePayload)
        .eq('lead_id', leadId)
        .eq('channel_id', channelId)
        .select('id')
        .limit(1);

    if (error) {
        await logSystemActivity('lead_channel_engagement_update_failed', leadId, error.message);
        throw new Error(`Failed to update lead channel engagement: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
        await logSystemActivity('lead_channel_engagement_update_missing', leadId, 'Lead channel update affected zero rows');
        throw new Error('Failed to update lead channel engagement');
    }
}

async function emitSMSReplyReceived(
    leadId: string,
    conversationId: string,
    replyText: string
): Promise<void> {
    try {
await eventEmitter.emit('lead_replied', {
  leadId,
  conversationId,
  metadata: {
    channel: 'sms',
    reply: replyText,
  },
  dedupeKey: `lead_replied:sms:${conversationId}:${replyText.trim().toLowerCase()}`,
});
    } catch (error) {
        const message = toErrorMessage(error);
        await logSystemActivity('sms_reply_event_emit_failed', leadId, message);
        throw new Error(`Failed to emit SMS reply event: ${message}`);
    }
}

async function loadAiCloserDependency(): Promise<HandleReplyDependencies['aiCloser']> {
    const module: HandleReplyDependencies = await import('./aiCloser');
    return module.aiCloser;
}

class SMSCloser {
    public async sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult> {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

        if (!isNonEmptyString(normalizedPhoneNumber)) {
            return {
                success: false,
                error: 'Phone number is required',
            };
        }

        if (!isNonEmptyString(message)) {
            return {
                success: false,
                error: 'Message body is required',
            };
        }

        try {
            const twilioPhoneNumber = requireEnv('TWILIO_PHONE_NUMBER');
            const client = getTwilioClient();

            const result = await client.messages.create({
                body: message.trim(),
                from: twilioPhoneNumber,
                to: normalizedPhoneNumber,
            });

            if (!isNonEmptyString(result.sid)) {
                await logSystemActivity('sms_send_invalid_response', normalizedPhoneNumber, 'Twilio returned an invalid SID');
                return {
                    success: false,
                    error: 'Twilio returned an invalid response',
                };
            }

            return {
                success: true,
                sid: result.sid,
            };
        } catch (error) {
            const messageText = toErrorMessage(error);
            await logSystemActivity('sms_send_failed', normalizedPhoneNumber, messageText);
            return {
                success: false,
                error: messageText,
            };
        }
    }

    public async startConversation(leadId: string, phoneNumber: string): Promise<string> {
        const normalizedLeadId = leadId.trim();
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

        if (!isNonEmptyString(normalizedLeadId)) {
            throw new Error('Lead ID is required');
        }

        if (!isNonEmptyString(normalizedPhoneNumber)) {
            throw new Error('Phone number is required');
        }

        const result = await this.ensureConversation(normalizedLeadId, normalizedPhoneNumber);

        return result.conversationId;
    }

    public async handleReply(phoneNumber: string, replyText: string): Promise<void> {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const normalizedReplyText = replyText.trim();

        if (!isNonEmptyString(normalizedPhoneNumber)) {
            throw new Error('Phone number is required');
        }

        if (!isNonEmptyString(normalizedReplyText)) {
            throw new Error('Reply text is required');
        }

        const smsChannel = await getSMSChannelRow();
        const leadChannel = await findLeadChannelByPhone(normalizedPhoneNumber, smsChannel.id);

        if (leadChannel === null) {
            await logSystemActivity('sms_reply_unmatched_phone', normalizedPhoneNumber, 'No matching lead channel found');
            return;
        }

        const lead = await getLeadById(leadChannel.lead_id);
        const conversation = await this.ensureConversation(lead.id, normalizedPhoneNumber);
        const aiCloser = await loadAiCloserDependency();

        try {
            await aiCloser.handleReply(conversation.conversationId, normalizedReplyText);
        } catch (error) {
            const message = toErrorMessage(error);
            await logSystemActivity('sms_ai_reply_handling_failed', lead.id, message);
            throw new Error(`Failed to handle AI reply: ${message}`);
        }

        const nowIso = new Date().toISOString();
        await updateLeadChannelEngagement(lead.id, smsChannel.id, nowIso);
        await emitSMSReplyReceived(lead.id, conversation.conversationId, normalizedReplyText);
    }

    private async ensureConversation(leadId: string, phoneNumber: string): Promise<StartConversationResult> {
        const smsChannel = await getSMSChannelRow();
        const existingConversation = await getExistingChannelConversation(leadId, smsChannel.id);

        if (existingConversation !== null) {
            await upsertLeadChannel(leadId, smsChannel.id, phoneNumber, new Date().toISOString());

            return {
                conversationId: existingConversation.conversationId,
                wasCreated: false,
            };
        }

        const lead = await getLeadById(leadId);
        const conversation = await createAiConversation(leadId);
        const nowIso = new Date().toISOString();

        try {
            await upsertLeadChannel(leadId, smsChannel.id, phoneNumber, nowIso);
            await createChannelConversationLink(leadId, smsChannel.id, conversation.id);
        } catch (error) {
            const message = toErrorMessage(error);

            const fallbackConversation = await getExistingChannelConversation(leadId, smsChannel.id);
            if (fallbackConversation !== null) {
                await logSystemActivity('sms_conversation_reused_after_conflict', leadId, message);
                return {
                    conversationId: fallbackConversation.conversationId,
                    wasCreated: false,
                };
            }

            await logSystemActivity('sms_conversation_setup_failed', leadId, message);
            throw error;
        }

        const introMessage = generateIntroMessage(lead);
        const sendResult = await this.sendMessage(phoneNumber, introMessage);

        if (!sendResult.success) {
            await logSystemActivity('sms_intro_send_failed', leadId, sendResult.error);
            throw new Error(`Failed to send intro SMS: ${sendResult.error}`);
        }

        return {
            conversationId: conversation.id,
            wasCreated: true,
        };
    }
}

export const smsCloser = new SMSCloser();