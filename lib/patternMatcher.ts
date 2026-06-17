import { supabase } from '@/lib/supabase';
import type { Json, Database } from '@/types/supabase';
import {
  WinningPatternRow,
  PatternMatchCriteria,
  PatternMatchResult,
  createPatternMatchResult,
} from './types/insights';

type SystemActivityInsert =
  Database['public']['Tables']['system_activity']['Insert'];

interface PatternScore {
  pattern: NormalizedWinningPattern;
  score: number;
}

type MatchType = PatternMatchResult['matchedOn'];

interface NormalizedWinningPattern {
  id: string;
  objectionType: string;
  recommendedResponse: string;
  successRate: number;
  targetIndustries: string[];
  minLeadScore: number | null;
  maxLeadScore: number | null;
  lastUsedAt: Date | null;
  timesUsed: number;
  confidenceScore: number;
  isActive: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function safeDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateDaysSince(date: Date | null): number | null {
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return null;

  return diffMs / (1000 * 60 * 60 * 24);
}

function normalizeCriteria(
  criteria: PatternMatchCriteria
): PatternMatchCriteria | null {
  const objectionType = normalizeString(criteria.objectionType);
  if (!isNonEmptyString(objectionType)) {
    return null;
  }

  return {
    objectionType,
    industry: normalizeString(criteria.industry),
    leadScore: normalizeNumber(criteria.leadScore),
    leadId: isNonEmptyString(criteria.leadId) ? criteria.leadId : undefined,
    conversationId: isNonEmptyString(criteria.conversationId)
      ? criteria.conversationId
      : undefined,
  };
}

function criteriaMetadata(criteria: PatternMatchCriteria): Json {
  return {
    objectionType: criteria.objectionType,
    industry: criteria.industry,
    leadScore: criteria.leadScore,
    leadId: criteria.leadId ?? null,
    conversationId: criteria.conversationId ?? null,
  };
}

async function logSystemActivity(params: {
  activityType: string;
  leadId?: string | null;
  message: string;
  details?: Json;
  createdAt?: string;
}): Promise<void> {
  const insertPayload: SystemActivityInsert = {
  activity_type: params.activityType,
  lead_id: params.leadId ?? null,
  details: {
    message: params.message,
    payload: params.details ?? null,
  },
  created_at: params.createdAt ?? nowIso(),
};

  const { error } = await supabase.from('system_activity').insert(insertPayload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

function normalizeWinningPatternRow(
  row: WinningPatternRow
): NormalizedWinningPattern | null {
  if (!isNonEmptyString(row.id)) {
    return null;
  }

  return {
    id: row.id,
    objectionType: normalizeString(row.objection_type),
    recommendedResponse: normalizeString(row.recommended_response),
    successRate: normalizeNumber(row.success_rate),
    targetIndustries: normalizeStringArray(row.target_industries),
    minLeadScore: normalizeNullableNumber(row.min_lead_score),
    maxLeadScore: normalizeNullableNumber(row.max_lead_score),
    lastUsedAt: safeDate(row.last_used_at),
    timesUsed: normalizeNumber(row.times_applied),
    confidenceScore: normalizeNumber(row.confidence_score),
    isActive: normalizeBoolean(row.is_active),
  };
}

export class PatternMatcher {
  async findBestPattern(
    criteria: PatternMatchCriteria
  ): Promise<PatternMatchResult> {
    const normalizedCriteria = normalizeCriteria(criteria);

    if (!normalizedCriteria) {
      return this.createFallbackResult();
    }

    try {
      const { data, error } = await supabase
        .from('winning_patterns')
        .select('*')
        .eq('objection_type', normalizedCriteria.objectionType)
        .eq('is_active', true);

      if (error) {
        await logSystemActivity({
          activityType: 'pattern_fetch_error',
          leadId: normalizedCriteria.leadId ?? null,
          message: error.message,
          details: criteriaMetadata(normalizedCriteria),
      });

        return this.createFallbackResult();
      }

      if (!Array.isArray(data) || data.length === 0) {
        return this.createFallbackResult();
      }

      const normalizedPatterns: NormalizedWinningPattern[] = data
        .map((row) => normalizeWinningPatternRow(row))
        .filter(
          (pattern): pattern is NormalizedWinningPattern => pattern !== null
        );

      if (normalizedPatterns.length === 0) {
        return this.createFallbackResult();
      }

      const scoredPatterns: PatternScore[] = normalizedPatterns
        .map((pattern) => ({
          pattern,
          score: this.calculatePatternScore(pattern, normalizedCriteria),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scoredPatterns.length === 0) {
        return this.createFallbackResult();
      }

      const bestMatch = scoredPatterns[0];

      void this.updatePatternMetrics(bestMatch.pattern.id);

      return createPatternMatchResult({
        patternId: bestMatch.pattern.id,
        response: bestMatch.pattern.recommendedResponse,
        confidence: bestMatch.score / 100,
        matchedOn: this.determineMatchType(
          bestMatch.pattern,
          normalizedCriteria
        ),
      });
    } catch (error) {
      await logSystemActivity({
        activityType: 'pattern_match_fatal',
        leadId: normalizedCriteria.leadId ?? null,
        message: safeErrorMessage(error),
        details: criteriaMetadata(normalizedCriteria),
      });

      return this.createFallbackResult();
    }
  }

  private calculatePatternScore(
    pattern: NormalizedWinningPattern,
    criteria: PatternMatchCriteria
  ): number {
    let score = 0;

    score += pattern.successRate * 0.4;

    if (
      isNonEmptyString(criteria.industry) &&
      pattern.targetIndustries.includes(criteria.industry)
    ) {
      score += 30;
    } else if (pattern.targetIndustries.length === 0) {
      score += 10;
    }

    if (
      pattern.minLeadScore !== null &&
      pattern.maxLeadScore !== null &&
      criteria.leadScore >= pattern.minLeadScore &&
      criteria.leadScore <= pattern.maxLeadScore
    ) {
      score += 20;
    }

    const daysSinceLastUse = calculateDaysSince(pattern.lastUsedAt);

    if (daysSinceLastUse !== null) {
      if (daysSinceLastUse < 7) {
        score += 10;
      } else if (daysSinceLastUse < 30) {
        score += 5;
      }
    }

    if (pattern.timesUsed > 10) {
      score += 15;
    } else if (pattern.timesUsed > 5) {
      score += 10;
    } else if (pattern.timesUsed > 0) {
      score += 5;
    }

    score += pattern.confidenceScore * 0.3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private determineMatchType(
    pattern: NormalizedWinningPattern,
    criteria: PatternMatchCriteria
  ): MatchType {
    if (
      isNonEmptyString(criteria.industry) &&
      pattern.targetIndustries.includes(criteria.industry)
    ) {
      return 'exact';
    }

    if (pattern.targetIndustries.length > 0) {
      return 'industry';
    }

    return 'fallback';
  }

  private createFallbackResult(): PatternMatchResult {
    return createPatternMatchResult({
      patternId: null,
      response: null,
      confidence: 0,
      matchedOn: 'none',
    });
  }

  private async updatePatternMetrics(patternId: string): Promise<void> {
    if (!isNonEmptyString(patternId)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('increment_pattern_usage', {
        pattern_id: patternId,
      });

      if (error) {
        await logSystemActivity({
        activityType: 'pattern_metric_error',
        leadId: null,
        message: error.message,
        details: {
          patternId,
        },
      });
      }
    } catch (error) {
      await logSystemActivity({
      activityType: 'pattern_metric_fatal',
      leadId: null,
      message: safeErrorMessage(error),
      details: {
        patternId,
      },
    });
    }
  }
}

export const patternMatcher = new PatternMatcher();