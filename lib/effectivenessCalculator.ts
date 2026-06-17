import { supabase } from './supabase';
import {
  ConversationInsightRow,
  EffectivenessScore,
  ResponseStats,
  createEffectivenessScore,
} from './types/insights';

/**
 * ============================
 * Types
 * ============================
 */

type ScoreRange = 'low' | 'medium' | 'high';

interface NormalizedInsight {
  id: string;
  objectionType: string;
  industry: string;
  leadScore: number;
  scoreRange: ScoreRange;
  sentimentAfter: string;
  ledToClose: boolean;
  ledToInterest: boolean;
  aiResponse: string;
  createdAt: Date | null;
}

/**
 * ============================
 * Utilities
 * ============================
 */

function nowIso(): string {
  return new Date().toISOString();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function safeDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function deriveScoreRange(score: number): ScoreRange {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * ============================
 * Observability
 * ============================
 */

async function logSystemActivity(params: {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('system_activity').insert({
    event_type: params.event_type,
    entity_id: params.entity_id,
    error_message: params.error_message,
    metadata: params.metadata,
    created_at: nowIso(),
  });

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

/**
 * ============================
 * Normalization
 * ============================
 */

function normalizeInsight(row: ConversationInsightRow): NormalizedInsight | null {
  if (!row || !isNonEmptyString(row.id)) return null;

  const leadScore = normalizeNumber((row as Record<string, unknown>)['lead_score']);
  const scoreRange = deriveScoreRange(leadScore);

  return {
    id: row.id,
    objectionType: normalizeString((row as Record<string, unknown>)['objection_type']),
    industry: normalizeString((row as Record<string, unknown>)['industry']),
    leadScore,
    scoreRange,
    sentimentAfter: normalizeString((row as Record<string, unknown>)['sentiment_after']),
    ledToClose: normalizeBoolean((row as Record<string, unknown>)['led_to_close']),
    ledToInterest: normalizeBoolean((row as Record<string, unknown>)['led_to_interest']),
    aiResponse: normalizeString((row as Record<string, unknown>)['ai_response']),
    createdAt: safeDate((row as Record<string, unknown>)['created_at']),
  };
}

/**
 * ============================
 * Effectiveness Calculator
 * ============================
 */

export class EffectivenessCalculator {
  async calculateScores(timeframeDays: number = 30): Promise<EffectivenessScore[]> {
    const safeDays = Number.isFinite(timeframeDays) && timeframeDays > 0 ? timeframeDays : 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - safeDays);

    try {
      const { data, error } = await supabase
        .from('conversation_insights')
        .select('*')
        .gte('created_at', cutoff.toISOString());

      if (error) {
        await logSystemActivity({
          event_type: 'insight_fetch_error',
          entity_id: 'conversation_insights',
          error_message: error.message,
          metadata: { timeframeDays: safeDays },
        });
        return [];
      }

      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      const normalized: NormalizedInsight[] = data
        .map(normalizeInsight)
        .filter((i): i is NormalizedInsight => i !== null);

      if (normalized.length === 0) {
        return [];
      }

      const groups = this.groupInsights(normalized);
      const results: EffectivenessScore[] = [];

      for (const [key, group] of Object.entries(groups)) {
        const [objectionType, industry, scoreRangeRaw] = key.split('|');

        const scoreRange: ScoreRange =
          scoreRangeRaw === 'high' || scoreRangeRaw === 'medium'
            ? scoreRangeRaw
            : 'low';

        const effectiveness = this.calculateGroupEffectiveness(group);
        const topResponse = this.findTopPerformingResponse(group);

        const result = createEffectivenessScore({
          objectionType,
          industry,
          scoreRange,
          effectiveness,
          topResponse,
          sampleSize: group.length,
        });

        results.push(result);

        await this.updateWinningPatterns(result);
      }

      return results;
    } catch (err) {
      await logSystemActivity({
        event_type: 'effectiveness_fatal',
        entity_id: 'effectiveness_calculator',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        metadata: {},
      });

      return [];
    }
  }

  /**
   * ============================
   * Grouping
   * ============================
   */

  private groupInsights(
    insights: NormalizedInsight[]
  ): Record<string, NormalizedInsight[]> {
    const acc: Record<string, NormalizedInsight[]> = {};

    for (const insight of insights) {
      const key = `${insight.objectionType}|${insight.industry}|${insight.scoreRange}`;

      if (!acc[key]) acc[key] = [];
      acc[key].push(insight);
    }

    return acc;
  }

  /**
   * ============================
   * Scoring
   * ============================
   */

  private calculateGroupEffectiveness(insights: NormalizedInsight[]): number {
    if (insights.length === 0) return 0;

    const weights = {
      close: 1.0,
      interest: 0.6,
      neutral: 0.2,
      negative: -0.2,
    };

    let total = 0;

    for (const i of insights) {
      if (i.ledToClose) total += weights.close;
      else if (i.ledToInterest) total += weights.interest;
      else if (i.sentimentAfter === 'neutral') total += weights.neutral;
      else if (i.sentimentAfter === 'negative') total += weights.negative;
    }

    const score = (total / insights.length) * 100;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * ============================
   * Top Response
   * ============================
   */

  private findTopPerformingResponse(insights: NormalizedInsight[]): string {
    const stats: Record<string, ResponseStats> = {};

    for (const i of insights) {
      const response = i.aiResponse;
      if (!isNonEmptyString(response)) continue;

      if (!stats[response]) {
        stats[response] = { count: 0, closes: 0, interest: 0 };
      }

      stats[response].count += 1;
      if (i.ledToClose) stats[response].closes += 1;
      if (i.ledToInterest) stats[response].interest += 1;
    }

    let bestResponse = '';
    let bestScore = -1;

    for (const [response, s] of Object.entries(stats)) {
      if (s.count < 3) continue;

      const score = (s.closes * 1.0 + s.interest * 0.6) / s.count;

      if (score > bestScore) {
        bestScore = score;
        bestResponse = response;
      }
    }

    if (isNonEmptyString(bestResponse)) return bestResponse;

    const fallback = insights.find((i) => isNonEmptyString(i.aiResponse));
    return fallback ? fallback.aiResponse : '';
  }

  /**
   * ============================
   * Pattern Persistence
   * ============================
   */

  private async updateWinningPatterns(params: EffectivenessScore): Promise<void> {
    if (params.effectiveness < 50 || params.sampleSize < 3) return;

    const rangeMap: Record<ScoreRange, { min: number; max: number }> = {
      low: { min: 0, max: 49 },
      medium: { min: 50, max: 79 },
      high: { min: 80, max: 100 },
    };

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('winning_patterns')
        .select('id')
        .eq('objection_type', params.objectionType)
        .contains('target_industries', [params.industry]);

      if (fetchError) {
        await logSystemActivity({
          event_type: 'pattern_fetch_error',
          entity_id: params.objectionType,
          error_message: fetchError.message,
          metadata: {},
        });
        return;
      }

      const existingId =
        Array.isArray(existing) && existing.length > 0
          ? existing[0].id
          : null;

      const payload = {
        objection_type: params.objectionType,
        recommended_response: params.topResponse,
        confidence_score: params.effectiveness,
        target_industries: [params.industry],
        min_lead_score: rangeMap[params.scoreRange].min,
        max_lead_score: rangeMap[params.scoreRange].max,
        success_rate: params.effectiveness,
      };

      if (existingId) {
        const { error: updateError } = await supabase
          .from('winning_patterns')
          .update(payload)
          .eq('id', existingId);

        if (updateError) {
          await logSystemActivity({
            event_type: 'pattern_update_error',
            entity_id: existingId,
            error_message: updateError.message,
            metadata: {},
          });
        }
      } else {
        const { error: insertError } = await supabase
          .from('winning_patterns')
          .insert(payload);

        if (insertError) {
          await logSystemActivity({
            event_type: 'pattern_insert_error',
            entity_id: params.objectionType,
            error_message: insertError.message,
            metadata: {},
          });
        }
      }
    } catch (err) {
      await logSystemActivity({
        event_type: 'pattern_persist_fatal',
        entity_id: params.objectionType,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        metadata: {},
      });
    }
  }
}

export const effectivenessCalculator = new EffectivenessCalculator();