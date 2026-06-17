import type { Database, Json } from '@/types/supabase';

export type PipelineRow = Database['public']['Tables']['deal_pipeline']['Row'];
export type PricingQuoteRow = Database['public']['Tables']['pricing_quotes']['Row'];

export const OBJECTION_CATEGORIES = [
  'happy_with_current_supplier',
  'too_busy',
  'not_interested',
  'send_me_something',
  'price_too_high',
  'contract_not_expiring_yet',
  'need_to_think_about_it',
  'generic',
] as const;

export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export type RebuttalTone = 'neutral' | 'warm' | 'skeptical' | 'price_sensitive' | 'busy';

export type GeneratedRebuttals = {
  consultative: string;
  direct: string;
  savings_focused: string;
  urgency_focused: string;
  short_follow_up: string;
};

export type RebuttalGenerationInput = {
  pipeline: PipelineRow;
  selectedQuote: PricingQuoteRow | null;
  objectionText: string;
  objectionCategory?: string | null;
  customerTone?: string | null;
};

export type RebuttalGenerationResult = {
  objection: string;
  category: ObjectionCategory;
  customerTone: RebuttalTone;
  rebuttals: GeneratedRebuttals;
};

export type Industry =
  | 'restaurant'
  | 'hotel'
  | 'manufacturing'
  | 'medical'
  | 'retail'
  | 'warehouse'
  | 'general';

export function detectIndustry(pipeline: PipelineRow): Industry {
  const source =
    `${pipeline.deal_name ?? ''} ${pipeline.customer_name ?? ''}`.toLowerCase();

  if (source.includes('restaurant') || source.includes('cafe') || source.includes('grill')) {
    return 'restaurant';
  }

  if (source.includes('hotel') || source.includes('inn') || source.includes('resort')) {
    return 'hotel';
  }

  if (source.includes('manufacturing') || source.includes('plant') || source.includes('industrial')) {
    return 'manufacturing';
  }

  if (source.includes('medical') || source.includes('clinic') || source.includes('dental')) {
    return 'medical';
  }

  if (source.includes('retail') || source.includes('store') || source.includes('shop')) {
    return 'retail';
  }

  if (source.includes('warehouse') || source.includes('distribution')) {
    return 'warehouse';
  }

  return 'general';
}

export function getIndustryPainPoints(industry: Industry): string {
  switch (industry) {
    case 'restaurant':
      return 'tight margins, high daily energy usage, and constant pressure to control operating costs';

    case 'hotel':
      return '24/7 energy demand, guest comfort expectations, and high fixed overhead';

    case 'manufacturing':
      return 'large load consumption, production cost sensitivity, and exposure to rate fluctuations';

    case 'medical':
      return 'critical uptime requirements, equipment reliability, and cost stability';

    case 'retail':
      return 'thin margins, multiple locations, and the need to control overhead across stores';

    case 'warehouse':
      return 'large space conditioning costs, lighting loads, and operational efficiency pressure';

    default:
      return 'ongoing operational costs and the need to avoid unnecessary overhead';
  }
}

function getStageRisk(pipeline: PipelineRow): string {
  switch (pipeline.stage) {
    case 'lead':
      return 'most businesses wait too long to review options and lose leverage before the real decision window even opens';

    case 'qualified':
      return 'once the review window gets pushed back, decisions usually get made under time pressure instead of from a position of control';

    case 'pricing_requested':
      return 'if pricing is not reviewed while options are still open, the business can end up defaulting into terms that were never properly compared';

    case 'quoted':
      return 'at this point, the biggest risk is seeing the numbers and still letting the current path continue without measuring what it may cost over the full term';

    case 'enrollment_submitted':
      return 'once execution is this close, delays usually create confusion, lost momentum, or unnecessary backtracking';

    case 'won':
      return 'the value now is confirming the decision was made with full visibility';

    case 'lost':
      return 'the lesson is usually that visibility came too late or the value was not framed clearly enough';

    default:
      return 'waiting usually reduces flexibility and increases the chance of accepting unnecessary cost';
  }
}

function getStagePositioning(pipeline: PipelineRow): string {
  switch (pipeline.stage) {
    case 'lead':
      return 'This is still early enough to evaluate cleanly.';

    case 'qualified':
      return 'This is the stage where smart operators get clarity before the timeline starts dictating the outcome.';

    case 'pricing_requested':
      return 'The work has already started, so the next step is simply making sure the numbers get reviewed with proper context.';

    case 'quoted':
      return 'The quote is already in hand, so this is no longer theoretical.';

    case 'enrollment_submitted':
      return 'The decision has effectively been made, so now the value is in protecting momentum and completing execution cleanly.';

    case 'won':
      return 'This is now about reinforcing the value of the decision.';

    case 'lost':
      return 'This is now about understanding what would have made the value impossible to ignore.';

    default:
      return 'This is about keeping the decision in your hands.';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeObjectionCategory(value: string | null | undefined): ObjectionCategory {
  if (!isNonEmptyString(value)) {
    return 'generic';
  }

  const normalized = value.trim().toLowerCase();

  if ((OBJECTION_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as ObjectionCategory;
  }

  return 'generic';
}

export function normalizeCustomerTone(value: string | null | undefined): RebuttalTone {
  if (!isNonEmptyString(value)) {
    return 'neutral';
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'warm':
    case 'skeptical':
    case 'price_sensitive':
    case 'busy':
      return normalized;
    default:
      return 'neutral';
  }
}

function formatCurrency(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRate(rate: number | null, unit: string | null): string | null {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return null;
  }

  return `${rate}${unit ? ` ${unit}` : ''}`;
}

function describeOffer(pipeline: PipelineRow, selectedQuote: PricingQuoteRow | null): string {
  const supplier = selectedQuote?.supplier_name ?? pipeline.supplier_name ?? 'our supplier option';
  const utility = selectedQuote?.utility_name ?? pipeline.utility_name ?? 'your current utility';
  const rate = formatRate(selectedQuote?.rate ?? null, selectedQuote?.rate_unit ?? null);
  const term = selectedQuote?.term_months ? `${selectedQuote.term_months}-month` : null;
  const annualSavings = formatCurrency(selectedQuote?.estimated_annual_savings);
  const monthlySavings = formatCurrency(selectedQuote?.estimated_monthly_savings);

  const parts = [
    supplier,
    utility !== supplier ? `for ${utility}` : null,
    term,
    rate ? `at ${rate}` : null,
    annualSavings ? `with estimated annual savings of ${annualSavings}` : null,
    monthlySavings ? `and monthly savings around ${monthlySavings}` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

function getContextSummary(pipeline: PipelineRow, selectedQuote: PricingQuoteRow | null): string {
  const dealName = pipeline.deal_name;
  const commodity = pipeline.commodity ?? 'energy';
  const serviceAddress = pipeline.service_address ?? 'the service location';
  const offer = describeOffer(pipeline, selectedQuote);

  const industry = detectIndustry(pipeline);
  const painPoints = getIndustryPainPoints(industry);

  return `${dealName} for ${commodity} service at ${serviceAddress}. This type of business typically deals with ${painPoints}. Current stage: ${pipeline.stage}. Offer context: ${offer}.`;
}

function buildConsultativeResponse(input: RebuttalGenerationInput, summary: string): string {
  const customerName = input.pipeline.customer_name ?? 'there';
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const stageRisk = getStageRisk(input.pipeline);
  const stagePositioning = getStagePositioning(input.pipeline);

  return `I understand, ${customerName}—that’s a common reaction at this stage.

In a business like yours, where ${painPoints}, this is really about getting visibility before the decision hardens into something more expensive or harder to unwind.

${stagePositioning} The practical risk is that ${stageRisk}

The value is simple: you get a clear look at whether the current direction is actually protecting the business, instead of finding out too late that margin, flexibility, or negotiating power was left on the table. ${summary}`;
}

function buildDirectResponse(input: RebuttalGenerationInput, summary: string): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const stageRisk = getStageRisk(input.pipeline);
  const stagePositioning = getStagePositioning(input.pipeline);

  return `Understood.

In your position, where ${painPoints}, this is not something that gets ignored if there is a real opportunity to improve the outcome.

${stagePositioning} The real exposure is that ${stageRisk}

That is why this matters: it prevents a business decision from being made in the dark, and it gives you the chance to protect cost, timing, and leverage before the current path becomes the default. ${summary}`;
}

function buildSavingsFocusedResponse(input: RebuttalGenerationInput, summary: string): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const stageRisk = getStageRisk(input.pipeline);
  const annualSavings = formatCurrency(input.selectedQuote?.estimated_annual_savings);
  const monthlySavings = formatCurrency(input.selectedQuote?.estimated_monthly_savings);

  return `I hear you.

In a business like yours, where ${painPoints}, fixed-cost discipline directly affects margin.

If there is room to improve that cost structure, that needs to be seen clearly before the existing path keeps absorbing dollars that should stay inside the business.

${annualSavings ? `The current projection is around ${annualSavings} annually` : 'There is measurable savings potential here'}${monthlySavings ? `, which works out to about ${monthlySavings} per month` : ''}. The real risk is that ${stageRisk}

The value is not just the savings figure itself—it is protecting margin, reducing unnecessary overhead, and stopping avoidable spend from quietly compounding over the term. ${summary}`;
}

function buildUrgencyFocusedResponse(input: RebuttalGenerationInput, summary: string): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const stageRisk = getStageRisk(input.pipeline);
  const stagePositioning = getStagePositioning(input.pipeline);

  return `That makes sense.

Where ${painPoints}, timing matters more than most people realize because flexibility drops quickly once the next contract decision gets too close.

${stagePositioning} The real issue is that ${stageRisk}

That is the value of acting now instead of later: you keep options open, preserve negotiating power, and avoid getting pushed into a decision window where the timeline has more control than you do. ${summary}`;
}

function buildShortFollowUpResponse(input: RebuttalGenerationInput, summary: string): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const stageRisk = getStageRisk(input.pipeline);

  return `Understood.

In a business like yours, where ${painPoints}, this is worth a quick side-by-side before the current path keeps moving on its own.

The real risk is that ${stageRisk}

The value is having clear visibility before anything locks in—so the business keeps control of the decision instead of inheriting unnecessary cost. ${summary}`;
}

export function generateRebuttals(
  input: RebuttalGenerationInput,
): RebuttalGenerationResult {
  const objection = input.objectionText.trim();
  const category = normalizeObjectionCategory(input.objectionCategory);
  const customerTone = normalizeCustomerTone(input.customerTone);
  const summary = getContextSummary(input.pipeline, input.selectedQuote);

  let rebuttals: GeneratedRebuttals = {
    consultative: buildConsultativeResponse(input, summary),
    direct: buildDirectResponse(input, summary),
    savings_focused: buildSavingsFocusedResponse(input, summary),
    urgency_focused: buildUrgencyFocusedResponse(input, summary),
    short_follow_up: buildShortFollowUpResponse(input, summary),
  };

  switch (category) {
    case 'happy_with_current_supplier':
      rebuttals = {
        ...rebuttals,
        direct: `That makes sense. A lot of strong operators stay with the incumbent supplier until there is a clear reason to review alternatives. The reason this is worth a look is to verify whether the current terms are still competitive before your next renewal decision is locked in.`,
      };
      break;

    case 'too_busy':
      rebuttals = {
        ...rebuttals,
        short_follow_up:
          'No problem. I can send a very short summary with the key numbers so you can review it when you have a moment and decide whether it is worth a deeper look.',
      };
      break;

    case 'price_too_high':
      rebuttals = {
        ...rebuttals,
        savings_focused:
          'I understand. If price is the concern, the right move is to compare the full contract value, not just the headline number. I can break down rate, term, and projected savings so you can see whether the offer actually improves the total position.',
      };
      break;

    case 'contract_not_expiring_yet':
      rebuttals = {
        ...rebuttals,
        urgency_focused:
          'That is fair. The reason to review now is not to force a switch early, but to get ahead of the renewal window while there is still time to evaluate options and plan the next move strategically.',
      };
      break;

    default:
      break;
  }

  return {
    objection,
    category,
    customerTone,
    rebuttals,
  };
}

export function rebuttalsToJson(result: RebuttalGenerationResult): Json {
  return {
    objection: result.objection,
    category: result.category,
    customerTone: result.customerTone,
    rebuttals: {
      consultative: result.rebuttals.consultative,
      direct: result.rebuttals.direct,
      savings_focused: result.rebuttals.savings_focused,
      urgency_focused: result.rebuttals.urgency_focused,
      short_follow_up: result.rebuttals.short_follow_up,
    },
  };
}