import type {
  NormalizedEnrollmentRequest,
  NormalizedEnrollmentResponse,
  NormalizedPricingRequest,
  NormalizedPricingResponse,
  ProviderResolutionResult,
} from '@/lib/integrations/types';
import {
  buildManualEnrollmentInstruction,
  buildManualPricingInstruction,
} from '@/lib/integrations/manualMessaging';

export function startManualPricingRequest(
  provider: ProviderResolutionResult,
  request: NormalizedPricingRequest,
): NormalizedPricingResponse {
  const instruction = buildManualPricingInstruction(provider, request);

  return {
    providerKey: provider.providerKey,
    mode: provider.integrationMode,
    success: true,
    requiresManualOperator: true,
    launchUrl: null,
    externalReference: null,
    normalizedQuote: null,
    message: instruction.message,
    rawPayload: {
      action: 'manual_instruction',
      instruction,
    },
  };
}

export function startManualEnrollmentRequest(
  provider: ProviderResolutionResult,
  request: NormalizedEnrollmentRequest,
): NormalizedEnrollmentResponse {
  const instruction = buildManualEnrollmentInstruction(provider, request);

  return {
    providerKey: provider.providerKey,
    mode: provider.integrationMode,
    success: true,
    requiresManualOperator: true,
    launchUrl: null,
    externalReference: null,
    normalizedStatus: null,
    message: instruction.message,
    rawPayload: {
      action: 'manual_instruction',
      instruction,
    },
  };
}