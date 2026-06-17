import type { Database } from '@/types/supabase';

import type { Json } from '@/types/supabase';

export type PipelineJson = Json;

export type PipelineStage =
  Database['public']['Enums']['pipeline_stage'];

export type PricingRequestStatus =
  Database['public']['Enums']['pricing_request_status'];

export type QuoteStatus =
  Database['public']['Enums']['quote_status'];

export type EnrollmentStatus =
  Database['public']['Enums']['enrollment_status'];

export type ContractOutcomeStatus =
  Database['public']['Enums']['contract_outcome_status'];

export type DealPipelineRow =
  Database['public']['Tables']['deal_pipeline']['Row'];

export type DealPipelineInsert =
  Database['public']['Tables']['deal_pipeline']['Insert'];

export type DealPipelineUpdate =
  Database['public']['Tables']['deal_pipeline']['Update'];

export type PricingRequestRow =
  Database['public']['Tables']['pricing_requests']['Row'];

export type PricingRequestInsert =
  Database['public']['Tables']['pricing_requests']['Insert'];

export type PricingRequestUpdate =
  Database['public']['Tables']['pricing_requests']['Update'];

export type PricingQuoteRow =
  Database['public']['Tables']['pricing_quotes']['Row'];

export type PricingQuoteInsert =
  Database['public']['Tables']['pricing_quotes']['Insert'];

export type PricingQuoteUpdate =
  Database['public']['Tables']['pricing_quotes']['Update'];

export type EnrollmentAttemptRow =
  Database['public']['Tables']['enrollment_attempts']['Row'];

export type EnrollmentAttemptInsert =
  Database['public']['Tables']['enrollment_attempts']['Insert'];

export type EnrollmentAttemptUpdate =
  Database['public']['Tables']['enrollment_attempts']['Update'];

export type ContractOutcomeRow =
  Database['public']['Tables']['contract_outcomes']['Row'];

export type ContractOutcomeInsert =
  Database['public']['Tables']['contract_outcomes']['Insert'];

export type ContractOutcomeUpdate =
  Database['public']['Tables']['contract_outcomes']['Update'];

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'lead',
  'qualified',
  'pricing_requested',
  'quoted',
  'enrollment_submitted',
  'won',
  'lost',
] as const;

export const PRICING_REQUEST_STATUSES: readonly PricingRequestStatus[] = [
  'pending',
  'submitted',
  'completed',
  'failed',
  'cancelled',
] as const;

export const QUOTE_STATUSES: readonly QuoteStatus[] = [
  'received',
  'selected',
  'expired',
  'rejected',
] as const;

export const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  'pending',
  'submitted',
  'accepted',
  'rejected',
  'failed',
] as const;

export const CONTRACT_OUTCOME_STATUSES: readonly ContractOutcomeStatus[] = [
  'won',
  'lost',
  'cancelled',
] as const;

export type PipelineCreateInput = {
  leadId?: string | null;
  proposalId?: string | null;
  autonomousDealId?: string | null;
  supplierName?: string | null;
  utilityName?: string | null;
  commodity?: string | null;
  serviceAddress?: string | null;
  accountNumber?: string | null;
  annualUsageKwh?: number | null;
  annualUsageTherms?: number | null;
  dealName: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  metadata?: PipelineJson | null;
};

export type PipelineStageUpdateInput = {
  pipelineId: string;
  stage: PipelineStage;
  notes?: string | null;
};

export type PricingRequestCreateInput = {
  pipelineId: string;
  requestSource?: string | null;
  supplierName?: string | null;
  utilityName?: string | null;
  commodity?: string | null;
  requestedLoadZone?: string | null;
  requestedTermMonths?: number | null;
  requestedUsage?: number | null;
  requestPayload?: PipelineJson | null;
  status?: PricingRequestStatus;
};

export type QuoteReceivedInput = {
  pipelineId: string;
  pricingRequestId: string;
  supplierName: string;
  utilityName?: string | null;
  commodity?: string | null;
  rate?: number | null;
  rateUnit?: string | null;
  termMonths?: number | null;
  estimatedMonthlySavings?: number | null;
  estimatedAnnualSavings?: number | null;
  commissionEstimate?: number | null;
  validUntil?: string | null;
  quotePayload?: PipelineJson | null;
  selectForPipeline?: boolean;
};

export type EnrollmentSubmitInput = {
  pipelineId: string;
  pricingQuoteId?: string | null;
  supplierName: string;
  enrollmentPayload?: PipelineJson | null;
  externalEnrollmentId?: string | null;
  status?: EnrollmentStatus;
  responsePayload?: PipelineJson | null;
  failureReason?: string | null;
};

export type ContractCloseInput = {
  pipelineId: string;
  status: ContractOutcomeStatus;
  enrollmentAttemptId?: string | null;
  pricingQuoteId?: string | null;
  supplierName?: string | null;
  utilityName?: string | null;
  commodity?: string | null;
  contractRate?: number | null;
  contractRateUnit?: string | null;
  termMonths?: number | null;
  estimatedMonthlySavings?: number | null;
  estimatedAnnualSavings?: number | null;
  realizedCommission?: number | null;
  closedReason?: string | null;
  notes?: string | null;
  outcomePayload?: PipelineJson | null;
};

export type PipelineActivityKind =
  | 'pipeline_created'
  | 'pipeline_stage_changed'
  | 'pricing_request_created'
  | 'quote_received'
  | 'quote_selected'
  | 'enrollment_submitted'
  | 'contract_closed';

export type PipelineActivityLogInput = {
  pipelineId: string;
  kind: PipelineActivityKind;
  message: string;
  payload?: PipelineJson | null;
};

export type PipelineWithRelations = DealPipelineRow & {
  pricing_requests?: PricingRequestRow[];
  pricing_quotes?: PricingQuoteRow[];
  enrollment_attempts?: EnrollmentAttemptRow[];
  contract_outcomes?: ContractOutcomeRow | null;
};