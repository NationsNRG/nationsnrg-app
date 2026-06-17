import { Database } from '@/types/supabase';

/**
 * =========================================================
 * Base Table Types (Generated)
 * =========================================================
 */

export type WinningPatternRow =
  Database['public']['Tables']['winning_patterns']['Row'];

export type ConversationInsightRow =
  Database['public']['Tables']['conversation_insights']['Row'];

/**
 * =========================================================
 * Domain Enums (Strict)
 * =========================================================
 */

export type MatchConfidence = number;

export type PatternMatchType = 'exact' | 'industry' | 'fallback' | 'none';

export type ScoreRange = 'low' | 'medium' | 'high';

/**
 * =========================================================
 * Input Types
 * =========================================================
 */

export interface PatternMatchCriteria {
  objectionType: string;
  industry: string;
  leadScore: number;
  leadId?: string;
  conversationId?: string;
}

/**
 * =========================================================
 * Utility Normalizers (Pure + Safe)
 * =========================================================
 */

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

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function safeDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeScoreRange(value: unknown): ScoreRange {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'low';
}

function normalizeMatchType(value: unknown): PatternMatchType {
  if (
    value === 'exact' ||
    value === 'industry' ||
    value === 'fallback' ||
    value === 'none'
  ) {
    return value;
  }
  return 'none';
}

function normalizeConfidence(value: unknown): MatchConfidence {
  const num = normalizeNumber(value);
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function deriveScoreRange(score: number): ScoreRange {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * =========================================================
 * Normalized Domain Models
 * =========================================================
 */

export interface WinningPattern {
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

export interface ConversationInsight {
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
 * =========================================================
 * Row Normalizers (STRICT + SAFE)
 * =========================================================
 */

export function normalizeWinningPattern(
  row: WinningPatternRow | null
): WinningPattern | null {
  if (!row || !isNonEmptyString(row.id)) return null;

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

export function normalizeConversationInsight(
  row: ConversationInsightRow | null
): ConversationInsight | null {
  if (!row || !isNonEmptyString(row.id)) return null;

  const leadScore = normalizeNumber((row as Record<string, unknown>)['lead_score']);

  return {
    id: row.id,
    objectionType: normalizeString((row as Record<string, unknown>)['objection_type']),
    industry: normalizeString((row as Record<string, unknown>)['industry']),
    leadScore,
    scoreRange: deriveScoreRange(leadScore),
    sentimentAfter: normalizeString((row as Record<string, unknown>)['sentiment_after']),
    ledToClose: normalizeBoolean((row as Record<string, unknown>)['led_to_close']),
    ledToInterest: normalizeBoolean((row as Record<string, unknown>)['led_to_interest']),
    aiResponse: normalizeString((row as Record<string, unknown>)['ai_response']),
    createdAt: safeDate((row as Record<string, unknown>)['created_at']),
  };
}

/**
 * =========================================================
 * Pattern Match Result
 * =========================================================
 */

export interface PatternMatchResult {
  patternId: string | null;
  response: string | null;
  confidence: MatchConfidence;
  matchedOn: PatternMatchType;
}

export function createPatternMatchResult(
  input: Partial<PatternMatchResult>
): PatternMatchResult {
  return {
    patternId: isNonEmptyString(input.patternId)
      ? input.patternId
      : null,
    response: isNonEmptyString(input.response)
      ? input.response
      : null,
    confidence: normalizeConfidence(input.confidence),
    matchedOn: normalizeMatchType(input.matchedOn),
  };
}

/**
 * =========================================================
 * Effectiveness Score
 * =========================================================
 */

export interface EffectivenessScore {
  objectionType: string;
  industry: string;
  scoreRange: ScoreRange;
  effectiveness: number;
  topResponse: string;
  sampleSize: number;
}

export function createEffectivenessScore(
  input: Partial<EffectivenessScore>
): EffectivenessScore {
  return {
    objectionType: normalizeString(input.objectionType),
    industry: normalizeString(input.industry),
    scoreRange: normalizeScoreRange(input.scoreRange),
    effectiveness: normalizeNumber(input.effectiveness),
    topResponse: normalizeString(input.topResponse),
    sampleSize: normalizeNumber(input.sampleSize),
  };
}

/**
 * =========================================================
 * Response Stats
 * =========================================================
 */

export interface ResponseStats {
  count: number;
  closes: number;
  interest: number;
}

export function createEmptyResponseStats(): ResponseStats {
  return {
    count: 0,
    closes: 0,
    interest: 0,
  };
}

export function accumulateResponseStats(
  base: ResponseStats,
  delta: Partial<ResponseStats>
): ResponseStats {
  return {
    count: base.count + normalizeNumber(delta.count),
    closes: base.closes + normalizeNumber(delta.closes),
    interest: base.interest + normalizeNumber(delta.interest),
  };
}