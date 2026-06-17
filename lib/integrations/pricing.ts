import type {
  NormalizedPricingRequest,
  NormalizedPricingResponse,
  ProviderKey,
  ProviderResolutionResult,
} from '@/lib/integrations/types';
import { resolveProviderForSupplier, getProviderDefinition } from '@/lib/integrations/providers';
import { startBoxWidgetPricingRequest } from '@/lib/integrations/adapters/boxWidget';
import { startManualPricingRequest } from '@/lib/integrations/adapters/manual';

export function buildNormalizedPricingRequest(input: {
  pipelineId: string;
  pricingRequestId: string;
  supplierName: string | null;
  utilityName: string | null;
  commodity: string | null;
  serviceAddress: string | null;
  accountNumber: string | null;
  requestedUsage: number | null;
  requestedTermMonths: number | null;
  requestSource: string | null;
}): NormalizedPricingRequest {
  return {
    pipelineId: input.pipelineId,
    pricingRequestId: input.pricingRequestId,
    supplierName: input.supplierName,
    utilityName: input.utilityName,
    commodity: input.commodity,
    serviceAddress: input.serviceAddress,
    accountNumber: input.accountNumber,
    requestedUsage: input.requestedUsage,
    requestedTermMonths: input.requestedTermMonths,
    requestSource: input.requestSource,
    executionMetadata: {},
  };
}

export function resolvePricingProvider(
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

export function startPricingIntegration(input: {
  request: NormalizedPricingRequest;
  provider: ProviderResolutionResult;
}): NormalizedPricingResponse {
  const providerKey = String(input.provider.providerKey);

  switch (providerKey as ProviderKey | string) {
    case 'box_widget':
      return startBoxWidgetPricingRequest(input.provider, input.request);

    case 'manual_florida_city_gas':
    case 'manual_generic':
      return startManualPricingRequest(input.provider, input.request);

    case 'box_api':
      return {
        providerKey: input.provider.providerKey,
        mode: input.provider.integrationMode,
        success: false,
        requiresManualOperator: false,
        launchUrl: null,
        externalReference: null,
        normalizedQuote: null,
        message:
          'BOX API adapter is reserved but not implemented yet. Use the widget or manual workflow for now.',
        rawPayload: {
          providerKey: input.provider.providerKey,
        },
      };

    default:
      return startManualPricingRequest(input.provider, input.request);
  }
}

export function normalizePricingIntegrationResult(
  response: NormalizedPricingResponse,
): NormalizedPricingResponse {
  return response;
}