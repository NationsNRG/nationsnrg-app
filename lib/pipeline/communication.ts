import type { Database, Json } from '@/types/supabase';

export type PipelineRow = Database['public']['Tables']['deal_pipeline']['Row'];
export type PricingRequestRow = Database['public']['Tables']['pricing_requests']['Row'];
export type PricingQuoteRow = Database['public']['Tables']['pricing_quotes']['Row'];
export type EnrollmentAttemptRow =
  Database['public']['Tables']['enrollment_attempts']['Row'];

export const COMMUNICATION_TYPES = [
  'pricing_request_email',
  'proposal_email',
  'rebuttal_follow_up_email',
  'enrollment_submission_email',
  'general_follow_up_email',
] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const COMMUNICATION_CHANNELS = ['email', 'sms', 'note'] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export type GeneratedCommunication = {
  communicationType: CommunicationType;
  channel: 'email';
  subject: string;
  body: string;
  generatedFrom: string;
  metadata: Json;
};

export type CommunicationGenerationInput = {
  pipeline: PipelineRow;
  pricingRequest?: PricingRequestRow | null;
  selectedQuote?: PricingQuoteRow | null;
  enrollmentAttempt?: EnrollmentAttemptRow | null;
  proposalPayload?: Json | null;
  rebuttalPayload?: Json | null;
  communicationType: CommunicationType;
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

function formatRate(rate: number | null | undefined, unit: string | null | undefined): string | null {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return null;
  }

  return `${rate}${unit ? ` ${unit}` : ''}`;
}

function commodityLabel(value: string | null | undefined): string {
  if (!value) {
    return 'energy';
  }

  return value.replaceAll('_', ' ');
}

function customerName(pipeline: PipelineRow): string {
  return pipeline.customer_name?.trim() || 'Team';
}

function serviceAddress(pipeline: PipelineRow): string {
  return pipeline.service_address?.trim() || 'the service location';
}

function dealName(pipeline: PipelineRow): string {
  return pipeline.deal_name?.trim() || 'Energy Opportunity';
}

function utilityName(
  pipeline: PipelineRow,
  pricingRequest?: PricingRequestRow | null,
  selectedQuote?: PricingQuoteRow | null,
): string {
  return (
    selectedQuote?.utility_name?.trim() ||
    pricingRequest?.utility_name?.trim() ||
    pipeline.utility_name?.trim() ||
    'the current utility'
  );
}

function supplierName(
  pipeline: PipelineRow,
  pricingRequest?: PricingRequestRow | null,
  selectedQuote?: PricingQuoteRow | null,
  enrollmentAttempt?: EnrollmentAttemptRow | null,
): string {
  return (
    selectedQuote?.supplier_name?.trim() ||
    enrollmentAttempt?.supplier_name?.trim() ||
    pricingRequest?.supplier_name?.trim() ||
    pipeline.supplier_name?.trim() ||
    'the supplier'
  );
}

function accountNumber(pipeline: PipelineRow): string | null {
  return pipeline.account_number?.trim() || null;
}

function usageSummary(
  pipeline: PipelineRow,
  pricingRequest?: PricingRequestRow | null,
): string {
  if (pricingRequest?.requested_usage != null) {
    return `${pricingRequest.requested_usage}`;
  }

  if (pipeline.annual_usage_kwh != null) {
    return `${pipeline.annual_usage_kwh.toLocaleString()} kWh annually`;
  }

  if (pipeline.annual_usage_therms != null) {
    return `${pipeline.annual_usage_therms.toLocaleString()} therms annually`;
  }

  return 'usage information available on request';
}

function quoteSummary(selectedQuote: PricingQuoteRow | null): string {
  if (!selectedQuote) {
    return 'selected pricing details available in the pipeline';
  }

  const rate = formatRate(selectedQuote.rate, selectedQuote.rate_unit);
  const term =
    selectedQuote.term_months != null ? `${selectedQuote.term_months}-month term` : null;
  const annualSavings = formatCurrency(selectedQuote.estimated_annual_savings);
  const monthlySavings = formatCurrency(selectedQuote.estimated_monthly_savings);

  const parts = [
    rate ? `rate ${rate}` : null,
    term,
    annualSavings ? `estimated annual savings of ${annualSavings}` : null,
    monthlySavings ? `estimated monthly savings around ${monthlySavings}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'selected pricing details available in the pipeline';
}

function proposalSections(proposalPayload: Json | null | undefined): Record<string, string> {
  if (typeof proposalPayload !== 'object' || proposalPayload === null || Array.isArray(proposalPayload)) {
    return {};
  }

  const headline =
    typeof proposalPayload.headline === 'string' ? proposalPayload.headline : '';
  const executiveSummary =
    typeof proposalPayload.executive_summary === 'string'
      ? proposalPayload.executive_summary
      : '';
  const whySwitchNow =
    typeof proposalPayload.why_switch_now === 'string'
      ? proposalPayload.why_switch_now
      : '';
  const nextSteps =
    typeof proposalPayload.next_steps === 'string' ? proposalPayload.next_steps : '';
  const shortEmailVersion =
    typeof proposalPayload.short_email_version === 'string'
      ? proposalPayload.short_email_version
      : '';

  return {
    headline,
    executiveSummary,
    whySwitchNow,
    nextSteps,
    shortEmailVersion,
  };
}

function rebuttalSections(rebuttalPayload: Json | null | undefined): Record<string, string> {
  if (typeof rebuttalPayload !== 'object' || rebuttalPayload === null || Array.isArray(rebuttalPayload)) {
    return {};
  }

  const rebuttals =
    typeof rebuttalPayload.rebuttals === 'object' &&
    rebuttalPayload.rebuttals !== null &&
    !Array.isArray(rebuttalPayload.rebuttals)
      ? rebuttalPayload.rebuttals
      : null;

  if (!rebuttals) {
    return {};
  }

  return {
    consultative:
      typeof rebuttals.consultative === 'string' ? rebuttals.consultative : '',
    direct: typeof rebuttals.direct === 'string' ? rebuttals.direct : '',
    savingsFocused:
      typeof rebuttals.savings_focused === 'string' ? rebuttals.savings_focused : '',
    urgencyFocused:
      typeof rebuttals.urgency_focused === 'string' ? rebuttals.urgency_focused : '',
    shortFollowUp:
      typeof rebuttals.short_follow_up === 'string' ? rebuttals.short_follow_up : '',
  };
}

function buildPricingRequestEmail(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  const supplier = supplierName(input.pipeline, input.pricingRequest, input.selectedQuote);
  const utility = utilityName(input.pipeline, input.pricingRequest, input.selectedQuote);
  const commodity = commodityLabel(input.pricingRequest?.commodity ?? input.pipeline.commodity);
  const term =
    input.pricingRequest?.requested_term_months != null
      ? `${input.pricingRequest.requested_term_months} months`
      : 'requested term noted in the pipeline';
  const subject = `Pricing Request — ${dealName(input.pipeline)} — ${utility}`;
  const account = accountNumber(input.pipeline);
  const body = `Hello,

Please review the following pricing request for ${dealName(input.pipeline)}.

Commodity: ${commodity}
Utility: ${utility}
Supplier Target: ${supplier}
Service Address: ${serviceAddress(input.pipeline)}
${account ? `Account Number: ${account}` : 'Account Number: available on request'}
Requested Usage: ${usageSummary(input.pipeline, input.pricingRequest)}
Requested Term: ${term}

Please provide the best available pricing and any relevant supplier notes for review.

Thank you,
James Morris
NationsNRG`;

  return {
    communicationType: 'pricing_request_email',
    channel: 'email',
    subject,
    body,
    generatedFrom: 'pricing_request',
    metadata: {
      utility,
      supplier,
      commodity,
      requestedTermMonths: input.pricingRequest?.requested_term_months ?? null,
    },
  };
}

function buildProposalEmail(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  const sections = proposalSections(input.proposalPayload);
  const supplier = supplierName(input.pipeline, input.pricingRequest, input.selectedQuote);
  const subject = `${dealName(input.pipeline)} — ${supplier} proposal for review`;

  const body = `Hi ${customerName(input.pipeline)},

I put together a proposal for ${dealName(input.pipeline)} based on the selected option currently in the pipeline.

${sections.headline || `Proposed option through ${supplier}.`}

${sections.executiveSummary || quoteSummary(input.selectedQuote ?? null)}

${sections.whySwitchNow || 'The purpose of this review is to evaluate the offer clearly before the next contract decision hardens into a default outcome.'}

${sections.nextSteps || 'If the structure makes sense, the next step is simply to confirm and proceed with enrollment.'}

Best,
James Morris
NationsNRG`;

  return {
    communicationType: 'proposal_email',
    channel: 'email',
    subject,
    body,
    generatedFrom: 'proposal',
    metadata: {
      supplier,
      quoteId: input.selectedQuote?.id ?? null,
    },
  };
}

function buildRebuttalFollowUpEmail(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  const sections = rebuttalSections(input.rebuttalPayload);
  const selectedMessage =
    sections.shortFollowUp ||
    sections.consultative ||
    sections.savingsFocused ||
    sections.direct ||
    sections.urgencyFocused ||
    'I wanted to follow up with a quick side-by-side review so you can see whether there is a stronger path before the current decision window closes.';
  const subject = `${dealName(input.pipeline)} — quick follow-up`;

  const body = `Hi ${customerName(input.pipeline)},

I wanted to keep this simple.

${selectedMessage}

If helpful, I can send over the quick side-by-side summary so you can review it with full visibility and decide from there.

Best,
James Morris
NationsNRG`;

  return {
    communicationType: 'rebuttal_follow_up_email',
    channel: 'email',
    subject,
    body,
    generatedFrom: 'rebuttal',
    metadata: {
      quoteId: input.selectedQuote?.id ?? null,
    },
  };
}

function buildEnrollmentSubmissionEmail(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  const supplier = supplierName(
    input.pipeline,
    input.pricingRequest,
    input.selectedQuote,
    input.enrollmentAttempt,
  );
  const utility = utilityName(input.pipeline, input.pricingRequest, input.selectedQuote);
  const commodity = commodityLabel(input.selectedQuote?.commodity ?? input.pipeline.commodity);
  const account = accountNumber(input.pipeline);
  const subject = `Enrollment Submission — ${dealName(input.pipeline)} — ${supplier}`;
  const body = `Hello,

Please use this message as the enrollment submission reference for ${dealName(input.pipeline)}.

Customer: ${customerName(input.pipeline)}
Commodity: ${commodity}
Supplier: ${supplier}
Utility: ${utility}
Service Address: ${serviceAddress(input.pipeline)}
${account ? `Account Number: ${account}` : 'Account Number: available on request'}
Selected Quote: ${quoteSummary(input.selectedQuote ?? null)}
${
  input.enrollmentAttempt?.external_enrollment_id
    ? `Internal Enrollment Reference: ${input.enrollmentAttempt.external_enrollment_id}`
    : 'Internal Enrollment Reference: available in the pipeline'
}

Please confirm receipt and provide the external confirmation or tracking reference when available.

Thank you,
James Morris
NationsNRG`;

  return {
    communicationType: 'enrollment_submission_email',
    channel: 'email',
    subject,
    body,
    generatedFrom: 'enrollment_execution',
    metadata: {
      supplier,
      enrollmentAttemptId: input.enrollmentAttempt?.id ?? null,
      quoteId: input.selectedQuote?.id ?? null,
    },
  };
}

function buildGeneralFollowUpEmail(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  const subject = `${dealName(input.pipeline)} — follow-up`;
  const body = `Hi ${customerName(input.pipeline)},

I wanted to follow up on ${dealName(input.pipeline)}.

The main reason for checking back in is to make sure you have clear visibility into the current option before the next decision point closes off flexibility. ${quoteSummary(
    input.selectedQuote ?? null,
  )}

If useful, I can resend the proposal summary or keep it to a short side-by-side review.

Best,
James Morris
NationsNRG`;

  return {
    communicationType: 'general_follow_up_email',
    channel: 'email',
    subject,
    body,
    generatedFrom: 'pipeline',
    metadata: {
      pipelineStage: input.pipeline.stage,
      quoteId: input.selectedQuote?.id ?? null,
    },
  };
}

export function generateCommunication(
  input: CommunicationGenerationInput,
): GeneratedCommunication {
  switch (input.communicationType) {
    case 'pricing_request_email':
      return buildPricingRequestEmail(input);
    case 'proposal_email':
      return buildProposalEmail(input);
    case 'rebuttal_follow_up_email':
      return buildRebuttalFollowUpEmail(input);
    case 'enrollment_submission_email':
      return buildEnrollmentSubmissionEmail(input);
    case 'general_follow_up_email':
      return buildGeneralFollowUpEmail(input);
    default: {
      const exhaustive: never = input.communicationType;
      throw new Error(`Unsupported communication type: ${exhaustive}`);
    }
  }
}