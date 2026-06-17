import { conversationInsights } from './conversationInsights';

/**
 * =========================================================
 * Types
 * =========================================================
 */

export type ConversationStage =
  | 'intro'
  | 'interest'
  | 'objection'
  | 'closing'
  | 'negotiating'
  | 'closed';

export type Sentiment =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'angry';

export interface ConversationState {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_industry: string;
  estimated_savings: number;
  conversation_stage: ConversationStage;
  sentiment: Sentiment;
  objection_count: number;
  positive_signals: number;
  message_count: number;
  days_since_last_contact: number;
  price_mentioned: boolean;
  industry: string;
}

export type AIMove =
  | { type: 'soften'; message: string; urgency: 'low' | 'medium' | 'high'; timing?: number }
  | { type: 'educate'; message: string; topic: string; timing?: number }
  | { type: 'push_close'; message: string; confidence: number; timing?: number }
  | { type: 'handle_objection'; objection: string; response: string; timing?: number }
  | { type: 'follow_up'; message: string; timing: number }
  | { type: 'escalate_to_human'; reason: string };

/**
 * =========================================================
 * Utilities (Safe + Deterministic)
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

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deterministic pseudo-random selection (idempotent)
 */
function deterministicIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  return length > 0 ? positive % length : 0;
}

function pickDeterministic<T>(items: readonly T[], seed: string): T {
  const index = deterministicIndex(seed, items.length);
  return items[index];
}

/**
 * =========================================================
 * Normalization Layer
 * =========================================================
 */

function normalizeState(input: ConversationState): ConversationState {
  return {
    id: isNonEmptyString(input.id) ? input.id : 'unknown',
    lead_id: isNonEmptyString(input.lead_id) ? input.lead_id : 'unknown',
    lead_name: normalizeString(input.lead_name),
    lead_industry: normalizeString(input.lead_industry),
    estimated_savings: normalizeNumber(input.estimated_savings),
    conversation_stage: normalizeStage(input.conversation_stage),
    sentiment: normalizeSentiment(input.sentiment),
    objection_count: normalizeNumber(input.objection_count),
    positive_signals: normalizeNumber(input.positive_signals),
    message_count: normalizeNumber(input.message_count),
    days_since_last_contact: normalizeNumber(input.days_since_last_contact),
    price_mentioned: normalizeBoolean(input.price_mentioned),
    industry: normalizeString(input.industry),
  };
}

/**
 * =========================================================
 * AI Brain
 * =========================================================
 */

class AIBrain {
  async decideNextMove(
    rawState: ConversationState,
    history: unknown[] = []
  ): Promise<AIMove> {
    const state = normalizeState(rawState);

    // Guard invalid / terminal states
    if (state.conversation_stage === 'closed') {
      return {
        type: 'escalate_to_human',
        reason: 'Conversation already closed',
      };
    }

    /**
     * Case 1: Angry → immediate escalation
     */
    if (state.sentiment === 'angry') {
      return {
        type: 'escalate_to_human',
        reason: 'Lead is angry — human intervention required',
      };
    }

    /**
     * Case 2: Negative → soften
     */
    if (state.sentiment === 'negative') {
      return {
        type: 'soften',
        urgency: 'low',
        message: this.getSofteningMessage(state),
      };
    }

    /**
     * Case 3: High intent → close
     */
    if (
      state.positive_signals > 2 ||
      (state.conversation_stage === 'interest' &&
        state.sentiment === 'positive')
    ) {
      return {
        type: 'push_close',
        confidence: clampNumber(85, 0, 100),
        message: this.getClosingMessage(state),
      };
    }

    /**
     * Case 4: Active objection handling
     */
    if (
      state.objection_count > 0 &&
      state.conversation_stage === 'objection'
    ) {
      return {
        type: 'handle_objection',
        objection: this.detectObjection(state),
        response: this.getObjectionResponse(state),
      };
    }

    /**
     * Case 5: Follow-up timing
     */
    if (state.days_since_last_contact > 2) {
      return {
        type: 'follow_up',
        timing: this.calculateFollowUpTiming(state),
        message: this.getFollowUpMessage(state),
      };
    }

    /**
     * Case 6: Pattern intelligence
     */
    if (state.objection_count > 0) {
      try {
        const score = state.estimated_savings > 50000 ? 80 : 50;

        const response = await conversationInsights.findBestResponse(
          'price',
          state.lead_industry,
          score
        );

        if (isNonEmptyString(response)) {
          return {
            type: 'handle_objection',
            objection: 'detected',
            response,
          };
        }
      } catch {
        // Fail silently — handled by fallback below
      }
    }

    /**
     * Default: educate
     */
    return {
      type: 'educate',
      topic: 'savings potential',
      message: this.getEducationalMessage(state),
    };
  }

  /**
   * =========================================================
   * Timing Logic
   * =========================================================
   */

  calculateFollowUpTiming(state: ConversationState): number {
    if (state.sentiment === 'positive') return 6;
    if (state.sentiment === 'neutral') return 48;
    if (state.sentiment === 'negative') return 120;
    return 24;
  }

  /**
   * =========================================================
   * Message Generators (Deterministic)
   * =========================================================
   */

  private getSofteningMessage(state: ConversationState): string {
    const templates = [
      `Totally understand if now's not the right time. Would you prefer I check back in a few months?`,
      `No pressure at all. Just wanted to make sure you knew about the potential savings.`,
      `I hear you. If timing changes, we're here. In the meantime, is there anything specific about energy costs you're curious about?`,
    ] as const;

    return pickDeterministic(templates, state.id + 'soften');
  }

  private getClosingMessage(state: ConversationState): string {
    const templates = [
      `Great! I can lock this rate in for you in about 3 minutes. Want me to send the enrollment link?`,
      `Awesome. Based on what you're saying, we should move forward. I'll send the contract now.`,
      `Perfect timing - rates just shifted in your favor. Ready to lock this in?`,
    ] as const;

    return pickDeterministic(templates, state.id + 'close');
  }

  private getEducationalMessage(state: ConversationState): string {
    const industry =
      isNonEmptyString(state.industry) ? state.industry : 'businesses like yours';

    const templates = [
      `Most ${industry} don't realize they're overpaying by 15-25%. Want me to show you the breakdown?`,
      `Based on your usage patterns, you're likely in the wrong rate tier. Worth a quick look?`,
      `Energy markets are volatile right now. Locking in could save you thousands.`,
    ] as const;

    return pickDeterministic(templates, state.id + 'educate');
  }

  private getFollowUpMessage(state: ConversationState): string {
    const templates = [
      `Quick heads up - rates shifted this week. That savings estimate may actually be higher now. Want me to check?`,
      `Just circling back. Still interested in seeing if we can save you money?`,
      `Following up one last time. If you're not interested, just say the word and I'll close the loop.`,
    ] as const;

    return pickDeterministic(templates, state.id + 'follow');
  }

  private getObjectionResponse(state: ConversationState): string {
    const templates = [
      `Totally fair. Out of curiosity—are you currently locked into a contract, or just not seeing savings worth switching?`,
      `I get it. Most of our clients felt the same way until they saw the numbers. Mind if I share a quick example?`,
      `No worries. If you change your mind, we're here.`,
    ] as const;

    return pickDeterministic(templates, state.id + 'objection');
  }

  private detectObjection(_state: ConversationState): string {
    return 'price_or_timing';
  }
}

export const aiBrain = new AIBrain();