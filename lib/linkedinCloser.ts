import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

type PublicSchema = Database['public'];
type LeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type AiConversationRow = PublicSchema['Tables']['ai_conversations']['Row'];
type AiConversationInsert = PublicSchema['Tables']['ai_conversations']['Insert'];
type LeadChannelInsert = PublicSchema['Tables']['lead_channels']['Insert'];
type ChannelRow = PublicSchema['Tables']['channels']['Row'];
type ChannelConversationRow = PublicSchema['Tables']['channel_conversations']['Row'];
type ChannelConversationInsert = PublicSchema['Tables']['channel_conversations']['Insert'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

const LINKEDIN_CHANNEL_NAME = 'linkedin';
const CONVERSATION_STAGE_INTRO = 'intro';
const SENTIMENT_NEUTRAL = 'neutral';

export interface LinkedInProfile {
    id: string;
    name: string;
    headline: string;
    industry: string;
    connectionDegree: number;
}

interface SendMessageSuccess {
    success: true;
    externalMessageId: string;
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

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && isNonEmptyString(error.message)) {
        return error.message;
    }

    return 'Unknown error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeString(value: string): string {
    return value.trim();
}

function normalizeProfile(profile: LinkedInProfile): LinkedInProfile {
    return {
        id: normalizeString(profile.id),
        name: normalizeString(profile.name),
        headline: normalizeString(profile.headline),
        industry: normalizeString(profile.industry),
        connectionDegree: isFiniteNumber(profile.connectionDegree)
            ? Math.max(1, Math.min(3, Math.round(profile.connectionDegree)))
            : 3,
    };
}

function isLeadRow(value: unknown): value is LeadRow {
    if (!isRecord(value)) {
        return false;
    }

    return isNonEmptyString(value.id);
}

function isAiConversationRow(value: unknown): value is AiConversationRow {
    if (!isRecord(value)) {
        return false;
    }

    return isNonEmptyString(value.id);
}

function isChannelRow(value: unknown): value is ChannelRow {
    if (!isRecord(value)) {
        return false;
    }

    return isNonEmptyString(value.id);
}

function isChannelConversationRow(value: unknown): value is ChannelConversationRow {
    if (!isRecord(value)) {
        return false;
    }

    return (
        isNonEmptyString(value.id) &&
        isNonEmptyString(value.lead_id) &&
        isNonEmptyString(value.channel_id) &&
        isNonEmptyString(value.ai_conversation_id)
    );
}

function getLeadBusinessName(lead: LeadRow): string {
    const candidate = (lead as Record<string, unknown>).business_name;

    if (isNonEmptyString(candidate)) {
        return candidate.trim();
    }

    return 'your business';
}

function getLeadEstimatedSavings(lead: LeadRow): number {
    const candidate = (lead as Record<string, unknown>).estimated_savings;

    if (isFiniteNumber(candidate)) {
        return Math.max(0, candidate);
    }

    return 0;
}

function getFirstName(fullName: string): string {
    const normalized = normalizeString(fullName);
    const [firstName] = normalized.split(/\s+/);

    return isNonEmptyString(firstName) ? firstName : 'there';
}

async function logSystemActivity(activityType: string, leadId: string | null, message: string): Promise<void> {
    const payload: SystemActivityInsert = {
        activity_type: activityType,
        lead_id: leadId,
        details: {
            message,
            source: 'linkedinCloser',
        },
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

async function getLinkedInChannelRow(): Promise<ChannelRow> {
    const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('name', LINKEDIN_CHANNEL_NAME)
        .maybeSingle();

    if (error) {
        await logSystemActivity('linkedin_channel_lookup_failed', null, error.message);
        throw new Error(`Failed to load LinkedIn channel: ${error.message}`);
    }

    if (!isChannelRow(data)) {
        await logSystemActivity('linkedin_channel_missing', null, 'LinkedIn channel is not configured');
        throw new Error('LinkedIn channel is not configured');
    }

    if (data.is_active !== true) {
        await logSystemActivity('linkedin_channel_inactive', null, 'LinkedIn channel is inactive');
        throw new Error('LinkedIn channel is inactive');
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
        await logSystemActivity('linkedin_lead_lookup_failed', leadId, error.message);
        throw new Error(`Failed to load lead: ${error.message}`);
    }

    if (!isLeadRow(data)) {
        await logSystemActivity('linkedin_lead_not_found', leadId, 'Lead not found');
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
        await logSystemActivity('linkedin_channel_conversation_lookup_failed', leadId, error.message);
        throw new Error(`Failed to load channel conversation: ${error.message}`);
    }

    if (!isChannelConversationRow(data)) {
        return null;
    }

    return {
        conversationId: data.ai_conversation_id,
    };
}

async function createAiConversation(leadId: string): Promise<AiConversationRow> {
    const payload: AiConversationInsert = {
        lead_id: leadId,
        conversation_stage: CONVERSATION_STAGE_INTRO,
        sentiment: SENTIMENT_NEUTRAL,
    };

    const { data, error } = await supabase
        .from('ai_conversations')
        .insert(payload)
        .select('*')
        .maybeSingle();

    if (error) {
        await logSystemActivity('linkedin_ai_conversation_create_failed', leadId, error.message);
        throw new Error(`Failed to create AI conversation: ${error.message}`);
    }

    if (!isAiConversationRow(data)) {
        await logSystemActivity('linkedin_ai_conversation_create_invalid', leadId, 'AI conversation insert returned no row');
        throw new Error('Failed to create AI conversation');
    }

    return data;
}

async function upsertLeadChannel(
    leadId: string,
    channelId: string,
    linkedinId: string,
    lastEngagedAtIso: string
): Promise<void> {
    const payload: LeadChannelInsert = {
        lead_id: leadId,
        channel_id: channelId,
        contact_value: linkedinId,
        last_engaged_at: lastEngagedAtIso,
        opt_out: false,
    };

    const { error } = await supabase
        .from('lead_channels')
        .upsert(payload, {
            onConflict: 'lead_id,channel_id',
        });

    if (error) {
        await logSystemActivity('linkedin_lead_channel_upsert_failed', leadId, error.message);
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
        await logSystemActivity('linkedin_channel_conversation_create_failed', leadId, error.message);
        throw new Error(`Failed to create channel conversation: ${error.message}`);
    }
}

class LinkedInCloser {
    public async sendMessage(profileId: string, message: string): Promise<SendMessageResult> {
        const normalizedProfileId = normalizeString(profileId);
        const normalizedMessage = normalizeString(message);

        if (!isNonEmptyString(normalizedProfileId)) {
            return {
                success: false,
                error: 'LinkedIn profile ID is required',
            };
        }

        if (!isNonEmptyString(normalizedMessage)) {
            return {
                success: false,
                error: 'Message body is required',
            };
        }

        try {
            console.log(`Sending LinkedIn message to ${normalizedProfileId}: ${normalizedMessage}`);

            await logSystemActivity(
                'linkedin_message_sent',
                null,
                JSON.stringify({
                    profileId: normalizedProfileId,
                    preview: normalizedMessage.slice(0, 100),
                })
            );

            return {
                success: true,
                externalMessageId: `linkedin:${normalizedProfileId}:${Date.now().toString()}`,
            };
        } catch (error) {
            const messageText = toErrorMessage(error);
            await logSystemActivity('linkedin_message_send_failed', null, messageText);

            return {
                success: false,
                error: messageText,
            };
        }
    }

    public async startConversation(leadId: string, linkedinId: string, profile: LinkedInProfile): Promise<string> {
        const normalizedLeadId = normalizeString(leadId);
        const normalizedLinkedInId = normalizeString(linkedinId);
        const normalizedProfile = normalizeProfile(profile);

        if (!isNonEmptyString(normalizedLeadId)) {
            throw new Error('Lead ID is required');
        }

        if (!isNonEmptyString(normalizedLinkedInId)) {
            throw new Error('LinkedIn ID is required');
        }

        if (!isNonEmptyString(normalizedProfile.id)) {
            throw new Error('LinkedIn profile ID is required');
        }

        const result = await this.ensureConversation(normalizedLeadId, normalizedLinkedInId, normalizedProfile);

        return result.conversationId;
    }

    private generateLinkedInIntro(lead: LeadRow, profile: LinkedInProfile): string {
        const firstName = getFirstName(profile.name);
        const industry = isNonEmptyString(profile.industry) ? profile.industry : 'your industry';
        const businessName = getLeadBusinessName(lead);
        const estimatedSavings = Math.round(getLeadEstimatedSavings(lead)).toLocaleString();

        return `Hi ${firstName}, I noticed your background in ${industry} and was reviewing ${businessName}'s energy profile. Based on my analysis, you might be overpaying by about $${estimatedSavings} annually. Worth a quick chat?`;
    }

    private async ensureConversation(
        leadId: string,
        linkedinId: string,
        profile: LinkedInProfile
    ): Promise<StartConversationResult> {
        const linkedinChannel = await getLinkedInChannelRow();
        const existingConversation = await getExistingChannelConversation(leadId, linkedinChannel.id);

        if (existingConversation !== null) {
            await upsertLeadChannel(leadId, linkedinChannel.id, linkedinId, new Date().toISOString());

            return {
                conversationId: existingConversation.conversationId,
                wasCreated: false,
            };
        }

        const lead = await getLeadById(leadId);
        const conversation = await createAiConversation(leadId);
        const nowIso = new Date().toISOString();

        try {
            await upsertLeadChannel(leadId, linkedinChannel.id, linkedinId, nowIso);
            await createChannelConversationLink(leadId, linkedinChannel.id, conversation.id);
        } catch (error) {
            const message = toErrorMessage(error);
            const fallbackConversation = await getExistingChannelConversation(leadId, linkedinChannel.id);

            if (fallbackConversation !== null) {
                await logSystemActivity('linkedin_conversation_reused_after_conflict', leadId, message);

                return {
                    conversationId: fallbackConversation.conversationId,
                    wasCreated: false,
                };
            }

            await logSystemActivity('linkedin_conversation_setup_failed', leadId, message);
            throw error;
        }

        const introMessage = this.generateLinkedInIntro(lead, profile);
        const sendResult = await this.sendMessage(linkedinId, introMessage);

        if (!sendResult.success) {
            await logSystemActivity('linkedin_intro_send_failed', leadId, sendResult.error);
            throw new Error(`Failed to send LinkedIn intro: ${sendResult.error}`);
        }

        await logSystemActivity('linkedin_conversation_started', leadId, 'LinkedIn conversation started successfully');

        return {
            conversationId: conversation.id,
            wasCreated: true,
        };
    }
}

export const linkedinCloser = new LinkedInCloser();