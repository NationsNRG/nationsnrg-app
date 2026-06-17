import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { patternMatcher } from './patternMatcher';
import { effectivenessCalculator } from './effectivenessCalculator';
import type {
  PatternMatchCriteria,
  PatternMatchResult,
  ScoreRange,
} from './types/insights';
import type { Json } from '@/types/supabase';

type Sentiment = 'positive' | 'neutral' | 'negative' | 'angry';

interface LeadInsightLookupRow {
  industry: string | null;
  lead_score: number | null;
}

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json;
  created_at: string;
}

interface ConversationInsightInsert {
  conversation_id: string;
  lead_id: string;
  objection_type: string;
  trigger_message: string;
  ai_response: string;
  sentiment_before: Sentiment;
  sentiment_after: Sentiment;
  led_to_interest: boolean;
  led_to_close: boolean;
  moved_stage: string | null;
  industry: string;
  lead_score: number;
  lead_score_range: ScoreRange;
  created_at: string;
}

function getRuntimeSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Missing Supabase key');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const runtimeSupabase = getRuntimeSupabase();

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
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toJsonObject(
  value: Record<string, Json | undefined>
): Json {
  return value;
}

function isLeadInsightLookupRow(value: unknown): value is LeadInsightLookupRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const industryValid =
    candidate.industry === null || typeof candidate.industry === 'string';

  const leadScoreValid =
    candidate.lead_score === null ||
    (typeof candidate.lead_score === 'number' && Number.isFinite(candidate.lead_score));

  return industryValid && leadScoreValid;
}

async function logSystemActivity(
  payload: Omit<SystemActivityInsert, 'created_at'> & {
    created_at?: string;
  }
): Promise<void> {
  const insertPayload: SystemActivityInsert = {
    event_type: payload.event_type,
    entity_id: payload.entity_id,
    error_message: payload.error_message ?? null,
    metadata: payload.metadata,
    created_at: payload.created_at ?? nowIso(),
  };

  const { error } = await runtimeSupabase
    .from('system_activity')
    .insert(insertPayload);

  if (error) {
    console.error('system_activity_failed', error.message);
  }
}

class ConversationInsightsTracker {
  async findBestResponse(
    objectionType: string,
    industry: string,
    leadScore: number,
    leadId?: string,
    conversationId?: string
  ): Promise<PatternMatchResult> {
    const criteria: PatternMatchCriteria = {
      objectionType: normalizeString(objectionType),
      industry: normalizeString(industry),
      leadScore: normalizeNumber(leadScore),
      leadId,
      conversationId,
    };

    try {
      return await patternMatcher.findBestPattern(criteria);
    } catch (error) {
      await logSystemActivity({
        event_type: 'pattern_match_failed',
        entity_id: conversationId ?? leadId ?? 'unknown',
        error_message: safeErrorMessage(error),
        metadata: toJsonObject({
          objectionType: criteria.objectionType,
          industry: criteria.industry,
          leadScore: criteria.leadScore,
          leadId: criteria.leadId ?? null,
          conversationId: criteria.conversationId ?? null,
        }),
      });

      return {
        patternId: null,
        response: null,
        confidence: 0,
        matchedOn: 'none',
      };
    }
  }

  async findWinningPattern(
    objectionType: string,
    industry: string,
    leadScore: number
  ): Promise<string | null> {
    const result = await this.findBestResponse(
      objectionType,
      industry,
      leadScore
    );

    return result.response;
  }

  async trackInteraction(
    conversationId: string,
    leadId: string,
    triggerMessage: string,
    aiResponse: string,
    sentimentBefore: Sentiment,
    sentimentAfter: Sentiment,
    movedStage: string | null,
    ledToInterest: boolean,
    ledToClose: boolean
  ): Promise<void> {
    try {
      const { data, error } = await runtimeSupabase
        .from('discovered_leads')
        .select('industry, lead_score')
        .eq('id', leadId)
        .limit(1);

      if (error) {
        await logSystemActivity({
          event_type: 'lead_fetch_failed',
          entity_id: leadId,
          error_message: error.message,
          metadata: toJsonObject({
            operation: 'trackInteraction',
          }),
        });
        return;
      }

      const lead = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (!isLeadInsightLookupRow(lead)) {
        return;
      }

      const normalizedLeadScore = normalizeNumber(lead.lead_score);
      const leadScoreRange = this.getLeadScoreRange(normalizedLeadScore);
      const objectionType = this.detectObjectionType(triggerMessage);

      const insertPayload: ConversationInsightInsert = {
        conversation_id: normalizeString(conversationId),
        lead_id: normalizeString(leadId),
        objection_type: objectionType,
        trigger_message: normalizeString(triggerMessage),
        ai_response: normalizeString(aiResponse),
        sentiment_before: sentimentBefore,
        sentiment_after: sentimentAfter,
        led_to_interest: ledToInterest,
        led_to_close: ledToClose,
        moved_stage: movedStage,
        industry: normalizeString(lead.industry) || 'unknown',
        lead_score: normalizedLeadScore,
        lead_score_range: leadScoreRange,
        created_at: nowIso(),
      };

      const { error: insertError } = await runtimeSupabase
        .from('conversation_insights')
        .insert(insertPayload);

      if (insertError) {
        await logSystemActivity({
          event_type: 'insight_insert_failed',
          entity_id: conversationId,
          error_message: insertError.message,
          metadata: toJsonObject({
            leadId,
            objectionType,
            leadScore: normalizedLeadScore,
            leadScoreRange,
          }),
        });
      }
    } catch (error) {
      await logSystemActivity({
        event_type: 'track_interaction_failed',
        entity_id: conversationId,
        error_message: safeErrorMessage(error),
        metadata: toJsonObject({
          leadId,
        }),
      });
    }
  }

  async runEffectivenessAnalysis(timeframeDays: number = 30) {
    try {
      return await effectivenessCalculator.calculateScores(timeframeDays);
    } catch (error) {
      await logSystemActivity({
        event_type: 'effectiveness_analysis_failed',
        entity_id: 'batch',
        error_message: safeErrorMessage(error),
        metadata: toJsonObject({
          timeframeDays,
        }),
      });

      return [];
    }
  }

  async calculateEffectivenessScores() {
    return await this.runEffectivenessAnalysis();
  }

  private detectObjectionType(message: string): string {
    const lower = message.toLowerCase();

    if (
      lower.includes('price') ||
      lower.includes('cost') ||
      lower.includes('expensive')
    ) {
      return 'price';
    }

    if (
      lower.includes('time') ||
      lower.includes('busy') ||
      lower.includes('later')
    ) {
      return 'timing';
    }

    if (
      lower.includes('supplier') ||
      lower.includes('current') ||
      lower.includes('happy with')
    ) {
      return 'supplier_loyalty';
    }

    if (
      lower.includes('trust') ||
      lower.includes('scam') ||
      lower.includes('legit')
    ) {
      return 'trust';
    }

    if (
      lower.includes('not interested') ||
      lower.includes('no thanks')
    ) {
      return 'disinterest';
    }

    if (
      lower.includes('need to think') ||
      lower.includes('consider')
    ) {
      return 'consideration';
    }

    return 'other';
  }

  private getLeadScoreRange(score: number): ScoreRange {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}

export const conversationInsights = new ConversationInsightsTracker();