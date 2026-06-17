import type {
  NormalizedEnrollmentRequest,
  NormalizedEnrollmentResponse,
  ProviderKey,
  ProviderResolutionResult,
} from '@/lib/integrations/types';
import { resolveProviderForSupplier, getProviderDefinition } from '@/lib/integrations/providers';
import { startBoxWidgetEnrollmentRequest } from '@/lib/integrations/adapters/boxWidget';
import { startManualEnrollmentRequest } from '@/lib/integrations/adapters/manual';

export function buildNormalizedEnrollmentRequest(input: {
  pipelineId: string;
  enrollmentAttemptId: string;
  supplierName: string | null;
  utilityName: string | null;
  commodity: string | null;
  serviceAddress: string | null;
  accountNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  selectedQuote: {
    pricingQuoteId: string | null;
    rate: number | null;
    rateUnit: string | null;
    termMonths: number | null;
  } | null;
}): NormalizedEnrollmentRequest {
  return {
    pipelineId: input.pipelineId,
    enrollmentAttemptId: input.enrollmentAttemptId,
    supplierName: input.supplierName,
    utilityName: input.utilityName,
    commodity: input.commodity,
    serviceAddress: input.serviceAddress,
    accountNumber: input.accountNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    selectedQuote: input.selectedQuote,
    executionMetadata: {},
  };
}

export function resolveEnrollmentProvider(
  supplierName: string | null | undefined,
  explicitProviderKey?: string | null,
): ProviderResolutionResult {
  if (explicitProviderKey) {
    const provider = getProviderDefinition(explicitProviderKey);
    if (!provider) {
      throw new Error(`Unknown provider key: ${explicitProviderKey}`);
    }

    return {
      supplierName: supplierName?.trim() || provider.displayName,
      providerKey: provider.providerKey,
      integrationMode: provider.integrationMode,
      capabilities: provider.capabilities,
      widgetUrl: provider.widgetUrl ?? null,
      apiBaseUrl: provider.apiBaseUrl ?? null,
      authType: provider.authType ?? null,
      metadata: provider.metadata ?? {},
    };
  }

  return resolveProviderForSupplier(supplierName);
}

export function startEnrollmentIntegration(input: {
  request: NormalizedEnrollmentRequest;
  provider: ProviderResolutionResult;
}): NormalizedEnrollmentResponse {
  const providerKey = String(input.provider.providerKey);

  switch (providerKey as ProviderKey | string) {
    case 'box_widget':
      return startBoxWidgetEnrollmentRequest(input.provider, input.request);

    case 'manual_florida_city_gas':
    case 'manual_generic':
      return startManualEnrollmentRequest(input.provider, input.request);

    case 'box_api':
      return {
        providerKey: input.provider.providerKey,
        mode: input.provider.integrationMode,
        success: false,
        requiresManualOperator: false,
        launchUrl: null,
        externalReference: null,
        normalizedStatus: null,
        message:
          'BOX API adapter is reserved but not implemented yet. Use the manual enrollment workflow for now.',
        rawPayload: {
          providerKey: input.provider.providerKey,
        },
      };

    default:
      return startManualEnrollmentRequest(input.provider, input.request);
  }
}

export function normalizeEnrollmentIntegrationResult(
  response: NormalizedEnrollmentResponse,
): NormalizedEnrollmentResponse {
  return response;
}