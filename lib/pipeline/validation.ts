import {
  CONTRACT_OUTCOME_STATUSES,
  ENROLLMENT_STATUSES,
  PIPELINE_STAGES,
  PRICING_REQUEST_STATUSES,
  QUOTE_STATUSES,
  type ContractCloseInput,
  type ContractOutcomeStatus,
  type EnrollmentStatus,
  type EnrollmentSubmitInput,
  type PipelineCreateInput,
  type PipelineStage,
  type PipelineStageUpdateInput,
  type PricingRequestCreateInput,
  type PricingRequestStatus,
  type QuoteReceivedInput,
  type QuoteStatus,
  type PipelineJson,
} from './types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STAGE_ORDER: Record<PipelineStage, number> = {
  lead: 0,
  qualified: 1,
  pricing_requested: 2,
  quoted: 3,
  enrollment_submitted: 4,
  won: 5,
  lost: 5,
};

export class PipelineValidationError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PipelineValidationError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is PipelineJson {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function toJsonObjectOrEmpty(value: unknown, fieldName: string): PipelineJson {
  if (value == null) {
    return {};
  }

  if (!isRecord(value) || !isJsonValue(value)) {
    throw new PipelineValidationError(`${fieldName} must be a valid JSON object.`);
  }

  return value;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toTrimmedOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toIntegerOrNull(value: unknown): number | null {
  const numeric = toFiniteNumberOrNull(value);
  if (numeric === null) {
    return null;
  }

  return Number.isInteger(numeric) ? numeric : null;
}

function validateEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new PipelineValidationError(`Invalid ${fieldName}.`);
  }

  return value as T;
}

export function validatePipelineStageTransition(
  currentStage: PipelineStage,
  nextStage: PipelineStage,
): void {
  if (currentStage === nextStage) {
    return;
  }

  if (currentStage === 'won' || currentStage === 'lost') {
    throw new PipelineValidationError(
      `Closed pipelines cannot move from ${currentStage} to ${nextStage}.`,
      409,
    );
  }

  if (nextStage === 'lead') {
    throw new PipelineValidationError('Pipelines cannot move backward to lead.', 409);
  }

  if (STAGE_ORDER[nextStage] < STAGE_ORDER[currentStage]) {
    throw new PipelineValidationError(
      `Pipelines cannot move backward from ${currentStage} to ${nextStage}.`,
      409,
    );
  }
}

export function validatePipelineCreateInput(input: unknown): PipelineCreateInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isNonEmptyString(input.dealName)) {
    throw new PipelineValidationError('dealName is required.');
  }

  const leadId = input.leadId;
  const proposalId = input.proposalId;
  const autonomousDealId = input.autonomousDealId;

  if (leadId != null && !isUuid(leadId)) {
    throw new PipelineValidationError('leadId must be a valid UUID.');
  }

  if (proposalId != null && !isUuid(proposalId)) {
    throw new PipelineValidationError('proposalId must be a valid UUID.');
  }

  if (autonomousDealId != null && !isUuid(autonomousDealId)) {
    throw new PipelineValidationError('autonomousDealId must be a valid UUID.');
  }

  const annualUsageKwh = toFiniteNumberOrNull(input.annualUsageKwh);
  const annualUsageTherms = toFiniteNumberOrNull(input.annualUsageTherms);

  if (input.annualUsageKwh != null && annualUsageKwh === null) {
    throw new PipelineValidationError('annualUsageKwh must be numeric.');
  }

  if (input.annualUsageTherms != null && annualUsageTherms === null) {
    throw new PipelineValidationError('annualUsageTherms must be numeric.');
  }

  if (input.metadata != null && (!isRecord(input.metadata) || !isJsonValue(input.metadata))) {
    throw new PipelineValidationError('metadata must be a valid JSON object.');
  }

  return {
    leadId: leadId ?? null,
    proposalId: proposalId ?? null,
    autonomousDealId: autonomousDealId ?? null,
    supplierName: toTrimmedOrNull(input.supplierName),
    utilityName: toTrimmedOrNull(input.utilityName),
    commodity: toTrimmedOrNull(input.commodity),
    serviceAddress: toTrimmedOrNull(input.serviceAddress),
    accountNumber: toTrimmedOrNull(input.accountNumber),
    annualUsageKwh,
    annualUsageTherms,
    dealName: input.dealName.trim(),
    customerName: toTrimmedOrNull(input.customerName),
    customerEmail: toTrimmedOrNull(input.customerEmail),
    customerPhone: toTrimmedOrNull(input.customerPhone),
    notes: toTrimmedOrNull(input.notes),
    metadata: toJsonObjectOrEmpty(input.metadata, 'metadata'),
  };
}

export function validatePipelineStageInput(input: unknown): PipelineStageUpdateInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isUuid(input.pipelineId)) {
    throw new PipelineValidationError('pipelineId must be a valid UUID.');
  }

  const stage = validateEnumValue(input.stage, PIPELINE_STAGES, 'stage');

  return {
    pipelineId: input.pipelineId,
    stage,
    notes: toTrimmedOrNull(input.notes),
  };
}

export function validatePricingRequestCreateInput(
  input: unknown,
): PricingRequestCreateInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isUuid(input.pipelineId)) {
    throw new PipelineValidationError('pipelineId must be a valid UUID.');
  }

  const requestedTermMonths = toIntegerOrNull(input.requestedTermMonths);
  const requestedUsage = toFiniteNumberOrNull(input.requestedUsage);

  if (input.requestedTermMonths != null && requestedTermMonths === null) {
    throw new PipelineValidationError('requestedTermMonths must be an integer.');
  }

  if (input.requestedUsage != null && requestedUsage === null) {
    throw new PipelineValidationError('requestedUsage must be numeric.');
  }

  if (
    input.requestPayload != null &&
    (!isRecord(input.requestPayload) || !isJsonValue(input.requestPayload))
  ) {
    throw new PipelineValidationError('requestPayload must be a valid JSON object.');
  }

  let status: PricingRequestStatus = 'pending';
  if (input.status != null) {
    status = validateEnumValue(
      input.status,
      PRICING_REQUEST_STATUSES,
      'pricing request status',
    );
  }

  return {
    pipelineId: input.pipelineId,
    requestSource: toTrimmedOrNull(input.requestSource),
    supplierName: toTrimmedOrNull(input.supplierName),
    utilityName: toTrimmedOrNull(input.utilityName),
    commodity: toTrimmedOrNull(input.commodity),
    requestedLoadZone: toTrimmedOrNull(input.requestedLoadZone),
    requestedTermMonths,
    requestedUsage,
    requestPayload: toJsonObjectOrEmpty(input.requestPayload, 'requestPayload'),
    status,
  };
}

export function validateQuoteReceivedInput(input: unknown): QuoteReceivedInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isUuid(input.pipelineId)) {
    throw new PipelineValidationError('pipelineId must be a valid UUID.');
  }

  if (!isUuid(input.pricingRequestId)) {
    throw new PipelineValidationError('pricingRequestId must be a valid UUID.');
  }

  if (!isNonEmptyString(input.supplierName)) {
    throw new PipelineValidationError('supplierName is required.');
  }

  const rate = toFiniteNumberOrNull(input.rate);
  const termMonths = toIntegerOrNull(input.termMonths);
  const estimatedMonthlySavings = toFiniteNumberOrNull(input.estimatedMonthlySavings);
  const estimatedAnnualSavings = toFiniteNumberOrNull(input.estimatedAnnualSavings);
  const commissionEstimate = toFiniteNumberOrNull(input.commissionEstimate);

  if (input.rate != null && rate === null) {
    throw new PipelineValidationError('rate must be numeric.');
  }

  if (input.termMonths != null && termMonths === null) {
    throw new PipelineValidationError('termMonths must be an integer.');
  }

  if (input.estimatedMonthlySavings != null && estimatedMonthlySavings === null) {
    throw new PipelineValidationError('estimatedMonthlySavings must be numeric.');
  }

  if (input.estimatedAnnualSavings != null && estimatedAnnualSavings === null) {
    throw new PipelineValidationError('estimatedAnnualSavings must be numeric.');
  }

  if (input.commissionEstimate != null && commissionEstimate === null) {
    throw new PipelineValidationError('commissionEstimate must be numeric.');
  }

  if (
    input.quotePayload != null &&
    (!isRecord(input.quotePayload) || !isJsonValue(input.quotePayload))
  ) {
    throw new PipelineValidationError('quotePayload must be a valid JSON object.');
  }

  if (input.validUntil != null) {
    const date = new Date(String(input.validUntil));
    if (Number.isNaN(date.getTime())) {
      throw new PipelineValidationError('validUntil must be a valid ISO date string.');
    }
  }

  return {
    pipelineId: input.pipelineId,
    pricingRequestId: input.pricingRequestId,
    supplierName: input.supplierName.trim(),
    utilityName: toTrimmedOrNull(input.utilityName),
    commodity: toTrimmedOrNull(input.commodity),
    rate,
    rateUnit: toTrimmedOrNull(input.rateUnit),
    termMonths,
    estimatedMonthlySavings,
    estimatedAnnualSavings,
    commissionEstimate,
    validUntil: toTrimmedOrNull(input.validUntil),
    quotePayload: toJsonObjectOrEmpty(input.quotePayload, 'quotePayload'),
    selectForPipeline: Boolean(input.selectForPipeline),
  };
}

export function validateEnrollmentSubmitInput(input: unknown): EnrollmentSubmitInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isUuid(input.pipelineId)) {
    throw new PipelineValidationError('pipelineId must be a valid UUID.');
  }

  if (input.pricingQuoteId != null && !isUuid(input.pricingQuoteId)) {
    throw new PipelineValidationError('pricingQuoteId must be a valid UUID.');
  }

  if (!isNonEmptyString(input.supplierName)) {
    throw new PipelineValidationError('supplierName is required.');
  }

  if (
    input.enrollmentPayload != null &&
    (!isRecord(input.enrollmentPayload) || !isJsonValue(input.enrollmentPayload))
  ) {
    throw new PipelineValidationError('enrollmentPayload must be a valid JSON object.');
  }

  if (
    input.responsePayload != null &&
    (!isRecord(input.responsePayload) || !isJsonValue(input.responsePayload))
  ) {
    throw new PipelineValidationError('responsePayload must be a valid JSON object.');
  }

  let status: EnrollmentStatus = 'submitted';
  if (input.status != null) {
    status = validateEnumValue(input.status, ENROLLMENT_STATUSES, 'enrollment status');
  }

  return {
    pipelineId: input.pipelineId,
    pricingQuoteId: (input.pricingQuoteId as string | undefined) ?? null,
    supplierName: input.supplierName.trim(),
    enrollmentPayload: toJsonObjectOrEmpty(input.enrollmentPayload, 'enrollmentPayload'),
    externalEnrollmentId: toTrimmedOrNull(input.externalEnrollmentId),
    status,
    responsePayload: toJsonObjectOrEmpty(input.responsePayload, 'responsePayload'),
    failureReason: toTrimmedOrNull(input.failureReason),
  };
}

export function validateContractCloseInput(input: unknown): ContractCloseInput {
  if (!isRecord(input)) {
    throw new PipelineValidationError('Invalid request body.');
  }

  if (!isUuid(input.pipelineId)) {
    throw new PipelineValidationError('pipelineId must be a valid UUID.');
  }

  if (input.enrollmentAttemptId != null && !isUuid(input.enrollmentAttemptId)) {
    throw new PipelineValidationError('enrollmentAttemptId must be a valid UUID.');
  }

  if (input.pricingQuoteId != null && !isUuid(input.pricingQuoteId)) {
    throw new PipelineValidationError('pricingQuoteId must be a valid UUID.');
  }

  const status = validateEnumValue(
    input.status,
    CONTRACT_OUTCOME_STATUSES,
    'contract outcome status',
  );

  const contractRate = toFiniteNumberOrNull(input.contractRate);
  const termMonths = toIntegerOrNull(input.termMonths);
  const estimatedMonthlySavings = toFiniteNumberOrNull(input.estimatedMonthlySavings);
  const estimatedAnnualSavings = toFiniteNumberOrNull(input.estimatedAnnualSavings);
  const realizedCommission = toFiniteNumberOrNull(input.realizedCommission);

  if (input.contractRate != null && contractRate === null) {
    throw new PipelineValidationError('contractRate must be numeric.');
  }

  if (input.termMonths != null && termMonths === null) {
    throw new PipelineValidationError('termMonths must be an integer.');
  }

  if (input.estimatedMonthlySavings != null && estimatedMonthlySavings === null) {
    throw new PipelineValidationError('estimatedMonthlySavings must be numeric.');
  }

  if (input.estimatedAnnualSavings != null && estimatedAnnualSavings === null) {
    throw new PipelineValidationError('estimatedAnnualSavings must be numeric.');
  }

  if (input.realizedCommission != null && realizedCommission === null) {
    throw new PipelineValidationError('realizedCommission must be numeric.');
  }

  if (
    input.outcomePayload != null &&
    (!isRecord(input.outcomePayload) || !isJsonValue(input.outcomePayload))
  ) {
    throw new PipelineValidationError('outcomePayload must be a valid JSON object.');
  }

  return {
    pipelineId: input.pipelineId,
    status,
    enrollmentAttemptId: (input.enrollmentAttemptId as string | undefined) ?? null,
    pricingQuoteId: (input.pricingQuoteId as string | undefined) ?? null,
    supplierName: toTrimmedOrNull(input.supplierName),
    utilityName: toTrimmedOrNull(input.utilityName),
    commodity: toTrimmedOrNull(input.commodity),
    contractRate,
    contractRateUnit: toTrimmedOrNull(input.contractRateUnit),
    termMonths,
    estimatedMonthlySavings,
    estimatedAnnualSavings,
    realizedCommission,
    closedReason: toTrimmedOrNull(input.closedReason),
    notes: toTrimmedOrNull(input.notes),
    outcomePayload: toJsonObjectOrEmpty(input.outcomePayload, 'outcomePayload'),
  };
}

export function validateQuoteStatus(value: unknown): QuoteStatus {
  return validateEnumValue(value, QUOTE_STATUSES, 'quote status');
}

export function validateContractOutcomeStatus(value: unknown): ContractOutcomeStatus {
  return validateEnumValue(value, CONTRACT_OUTCOME_STATUSES, 'contract outcome status');
}