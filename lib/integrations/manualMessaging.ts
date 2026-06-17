import type {
  ManualExecutionInstruction,
  NormalizedEnrollmentRequest,
  NormalizedPricingRequest,
  ProviderResolutionResult,
} from '@/lib/integrations/types';

function providerName(provider: ProviderResolutionResult): string {
  return provider.supplierName?.trim() || String(provider.providerKey);
}

export function buildManualPricingInstruction(
  provider: ProviderResolutionResult,
  request: NormalizedPricingRequest,
): ManualExecutionInstruction {
  return {
    providerKey: provider.providerKey,
    mode:
      provider.integrationMode === 'manual_portal' || provider.integrationMode === 'manual_phone'
        ? provider.integrationMode
        : 'manual_email',
    requiresManualOperator: true,
    message: `Pricing for ${providerName(provider)} currently requires manual execution. Send the pricing request externally, then ingest the returned pricing result into NationsNRG.`,
    nextStepLabel: 'Send pricing request manually',
    payload: {
      pipelineId: request.pipelineId,
      pricingRequestId: request.pricingRequestId,
      supplierName: request.supplierName,
      utilityName: request.utilityName,
      commodity: request.commodity,
      serviceAddress: request.serviceAddress,
      accountNumber: request.accountNumber,
      requestedUsage: request.requestedUsage,
      requestedTermMonths: request.requestedTermMonths,
    },
  };
}

export function buildManualEnrollmentInstruction(
  provider: ProviderResolutionResult,
  request: NormalizedEnrollmentRequest,
): ManualExecutionInstruction {
  return {
    providerKey: provider.providerKey,
    mode:
      provider.integrationMode === 'manual_portal' || provider.integrationMode === 'manual_phone'
        ? provider.integrationMode
        : 'manual_email',
    requiresManualOperator: true,
    message: `Enrollment for ${providerName(provider)} currently requires manual execution. Submit externally, then ingest the returned enrollment result into NationsNRG.`,
    nextStepLabel: 'Submit enrollment manually',
    payload: {
      pipelineId: request.pipelineId,
      enrollmentAttemptId: request.enrollmentAttemptId,
      supplierName: request.supplierName,
      utilityName: request.utilityName,
      commodity: request.commodity,
      serviceAddress: request.serviceAddress,
      accountNumber: request.accountNumber,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerPhone: request.customerPhone,
      selectedQuote: request.selectedQuote,
    },
  };
}