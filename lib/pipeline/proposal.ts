import type { Database, Json } from '@/types/supabase';
import { detectIndustry, getIndustryPainPoints } from '@/lib/pipeline/rebuttal';

export type PipelineRow = Database['public']['Tables']['deal_pipeline']['Row'];
export type PricingQuoteRow = Database['public']['Tables']['pricing_quotes']['Row'];

export type GeneratedProposal = {
  headline: string;
  executive_summary: string;
  current_situation: string;
  proposed_solution: string;
  savings_summary: string;
  why_switch_now: string;
  next_steps: string;
  short_email_version: string;
};

export type ProposalGenerationInput = {
  pipeline: PipelineRow;
  selectedQuote: PricingQuoteRow;
};

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

function buildHeadline(input: ProposalGenerationInput): string {
  const commodity = input.pipeline.commodity ?? 'Energy';
  const term = input.selectedQuote.term_months
    ? `${input.selectedQuote.term_months}-Month`
    : 'Energy';
  const dealName = input.pipeline.deal_name;

  return `${term} ${commodity.replaceAll('_', ' ')} Savings Proposal for ${dealName}`;
}

function buildExecutiveSummary(input: ProposalGenerationInput): string {
  const supplier = input.selectedQuote.supplier_name;
  const utility = input.selectedQuote.utility_name ?? input.pipeline.utility_name ?? 'the current utility';
  const rate = formatRate(input.selectedQuote.rate, input.selectedQuote.rate_unit);
  const term = input.selectedQuote.term_months ? `${input.selectedQuote.term_months}-month` : 'proposed';
  const annualSavings = formatCurrency(input.selectedQuote.estimated_annual_savings);

  return `This proposal outlines a ${term} supply option through ${supplier} for service currently tied to ${utility}${rate ? ` at ${rate}` : ''}. ${
    annualSavings
      ? `Based on the current quote, the opportunity is projecting approximately ${annualSavings} in annual savings.`
      : 'The purpose of this proposal is to evaluate whether the proposed structure creates a stronger overall position than the current path.'
  }`;
}

function buildCurrentSituation(input: ProposalGenerationInput): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);
  const serviceAddress = input.pipeline.service_address ?? 'the service location';

  return `This opportunity relates to service at ${serviceAddress}. In a business like this, where ${painPoints}, energy costs are not optional—they directly affect operating performance, margin, and financial control. The objective is to review the current direction before renewal pressure or default timing limits flexibility.`;
}

function buildProposedSolution(input: ProposalGenerationInput): string {
  const supplier = input.selectedQuote.supplier_name;
  const utility = input.selectedQuote.utility_name ?? input.pipeline.utility_name ?? 'the current utility';
  const commodity = input.selectedQuote.commodity ?? input.pipeline.commodity ?? 'energy';
  const rate = formatRate(input.selectedQuote.rate, input.selectedQuote.rate_unit) ?? 'the proposed market rate';
  const term = input.selectedQuote.term_months
    ? `${input.selectedQuote.term_months} months`
    : 'the proposed term';
  const accountNumber = input.pipeline.account_number ?? 'the referenced account';

  return `The proposed solution is a ${commodity.replaceAll('_', ' ')} supply option through ${supplier} for ${utility}, aligned to account ${accountNumber}, at ${rate} for ${term}. This creates a defined pricing path that can be reviewed against the current position before the existing timeline makes the decision by default.`;
}

function buildSavingsSummary(input: ProposalGenerationInput): string {
  const monthlySavings = formatCurrency(input.selectedQuote.estimated_monthly_savings);
  const annualSavings = formatCurrency(input.selectedQuote.estimated_annual_savings);
  const commissionEstimate = formatCurrency(input.selectedQuote.commission_estimate);

  const savingsParts = [
    annualSavings ? `Estimated annual savings: ${annualSavings}.` : null,
    monthlySavings ? `Estimated monthly savings: ${monthlySavings}.` : null,
    commissionEstimate ? `Estimated commission impact: ${commissionEstimate}.` : null,
  ].filter(Boolean);

  if (savingsParts.length === 0) {
    return 'Savings estimates are not yet fully populated, but the quote has been structured to support a side-by-side evaluation of cost, term, and supplier positioning.';
  }

  return savingsParts.join(' ');
}

function buildWhySwitchNow(input: ProposalGenerationInput): string {
  const industry = detectIndustry(input.pipeline);
  const painPoints = getIndustryPainPoints(industry);

  return `The reason to review and act now is simple: in a business where ${painPoints}, waiting usually reduces leverage and increases the chance of accepting a higher-cost path simply because it was never compared in time. This proposal is designed to create visibility before renewal pressure removes flexibility.`;
}

function buildNextSteps(input: ProposalGenerationInput): string {
  return `Review the proposed pricing, term, and savings profile side by side with the current position. If the structure makes sense, the next step is to confirm supplier alignment and proceed with enrollment so the business can secure the improved position before timing becomes the limiting factor.`;
}

function buildShortEmailVersion(input: ProposalGenerationInput): string {
  const supplier = input.selectedQuote.supplier_name;
  const rate = formatRate(input.selectedQuote.rate, input.selectedQuote.rate_unit);
  const annualSavings = formatCurrency(input.selectedQuote.estimated_annual_savings);

  return `I put together a proposal based on the selected ${supplier} option${rate ? ` at ${rate}` : ''}. ${
    annualSavings
      ? `The current projection is about ${annualSavings} in annual savings.`
      : 'The proposal is designed to show the current position against the proposed option clearly.'
  } The value here is visibility before the next contract decision locks in. If it makes sense, the next step is simply to confirm and move forward with enrollment.`;
}

export function generateProposal(input: ProposalGenerationInput): GeneratedProposal {
  return {
    headline: buildHeadline(input),
    executive_summary: buildExecutiveSummary(input),
    current_situation: buildCurrentSituation(input),
    proposed_solution: buildProposedSolution(input),
    savings_summary: buildSavingsSummary(input),
    why_switch_now: buildWhySwitchNow(input),
    next_steps: buildNextSteps(input),
    short_email_version: buildShortEmailVersion(input),
  };
}

export function proposalToJson(proposal: GeneratedProposal): Json {
  return {
    headline: proposal.headline,
    executive_summary: proposal.executive_summary,
    current_situation: proposal.current_situation,
    proposed_solution: proposal.proposed_solution,
    savings_summary: proposal.savings_summary,
    why_switch_now: proposal.why_switch_now,
    next_steps: proposal.next_steps,
    short_email_version: proposal.short_email_version,
  };
}