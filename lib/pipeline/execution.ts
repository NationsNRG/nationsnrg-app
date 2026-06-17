import type { Json } from '@/types/supabase';

export const PRICING_EXECUTION_STATUSES = [
  'internal_request_created',
  'sent_to_supplier',
  'awaiting_response',
  'supplier_followup_needed',
  'quote_received',
  'cancelled',
  'failed',
] as const;

export type PricingExecutionStatus =
  (typeof PRICING_EXECUTION_STATUSES)[number];

export const ENROLLMENT_EXECUTION_STATUSES = [
  'ready_to_submit',
  'submitted_to_supplier',
  'pending_supplier_review',
  'accepted',
  'rejected',
  'failed',
  'resubmission_needed',
  'cancelled',
] as const;

export type EnrollmentExecutionStatus =
  (typeof ENROLLMENT_EXECUTION_STATUSES)[number];

export const EXECUTION_SEND_METHODS = [
  'email',
  'portal',
  'phone',
  'widget',
  'manual_internal',
  'api',
  'other',
] as const;

export type ExecutionSendMethod = (typeof EXECUTION_SEND_METHODS)[number];

export type PricingExecutionRecord = {
  id: string;
  pipelineId: string;
  pricingRequestId: string;
  executionStatus: PricingExecutionStatus;
  sendMethod: ExecutionSendMethod;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientCompany: string | null;
  externalReference: string | null;
  sentAt: string | null;
  lastFollowUpAt: string | null;
  responseDueAt: string | null;
  responseReceivedAt: string | null;
  operatorNotes: string | null;
  executionPayload: Json;
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentExecutionRecord = {
  id: string;
  pipelineId: string;
  enrollmentAttemptId: string;
  executionStatus: EnrollmentExecutionStatus;
  sendMethod: ExecutionSendMethod;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientCompany: string | null;
  externalReference: string | null;
  submittedAt: string | null;
  lastFollowUpAt: string | null;
  responseReceivedAt: string | null;
  operatorNotes: string | null;
  failureReason: string | null;
  executionPayload: Json;
  createdAt: string;
  updatedAt: string;
};

export type PricingExecutionCreateInput = {
  pipelineId: string;
  pricingRequestId: string;
  executionStatus: PricingExecutionStatus;
  sendMethod: ExecutionSendMethod;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientCompany?: string | null;
  externalReference?: string | null;
  sentAt?: string | null;
  responseDueAt?: string | null;
  operatorNotes?: string | null;
  executionPayload?: Json;
};

export type PricingExecutionStatusUpdateInput = {
  executionId: string;
  executionStatus: PricingExecutionStatus;
  externalReference?: string | null;
  responseReceivedAt?: string | null;
  operatorNotes?: string | null;
  executionPayload?: Json;
};

export type PricingExecutionFollowUpInput = {
  executionId: string;
  followUpAt?: string | null;
  operatorNotes?: string | null;
};

export type EnrollmentExecutionCreateInput = {
  pipelineId: string;
  enrollmentAttemptId: string;
  executionStatus: EnrollmentExecutionStatus;
  sendMethod: ExecutionSendMethod;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientCompany?: string | null;
  externalReference?: string | null;
  submittedAt?: string | null;
  operatorNotes?: string | null;
  executionPayload?: Json;
};

export type EnrollmentExecutionStatusUpdateInput = {
  executionId: string;
  executionStatus: EnrollmentExecutionStatus;
  externalReference?: string | null;
  responseReceivedAt?: string | null;
  operatorNotes?: string | null;
  failureReason?: string | null;
  executionPayload?: Json;
};

export type EnrollmentExecutionFollowUpInput = {
  executionId: string;
  followUpAt?: string | null;
  operatorNotes?: string | null;
};

export const PRICING_EXECUTION_TRANSITIONS: Readonly<
  Record<PricingExecutionStatus, readonly PricingExecutionStatus[]>
> = {
  internal_request_created: ['sent_to_supplier', 'cancelled', 'failed'],
  sent_to_supplier: ['awaiting_response', 'supplier_followup_needed', 'cancelled', 'failed'],
  awaiting_response: ['supplier_followup_needed', 'quote_received', 'cancelled', 'failed'],
  supplier_followup_needed: ['awaiting_response', 'quote_received', 'cancelled', 'failed'],
  quote_received: [],
  cancelled: [],
  failed: [],
};

export const ENROLLMENT_EXECUTION_TRANSITIONS: Readonly<
  Record<EnrollmentExecutionStatus, readonly EnrollmentExecutionStatus[]>
> = {
  ready_to_submit: ['submitted_to_supplier', 'cancelled'],
  submitted_to_supplier: ['pending_supplier_review', 'accepted', 'rejected', 'failed', 'cancelled'],
  pending_supplier_review: ['accepted', 'rejected', 'failed', 'cancelled'],
  accepted: [],
  rejected: ['resubmission_needed', 'cancelled'],
  failed: ['resubmission_needed', 'cancelled'],
  resubmission_needed: ['submitted_to_supplier', 'cancelled'],
  cancelled: [],
};