import type {
  NormalizedEnrollmentRequest,
  NormalizedEnrollmentResponse,
  NormalizedPricingRequest,
  NormalizedPricingResponse,
  ProviderResolutionResult,
  WidgetLaunchPackage,
} from '@/lib/integrations/types';

function buildLaunchUrl(
  baseUrl: string,
  params: Record<string, string | null | undefined>,
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function buildPricingLaunchPackage(
  provider: ProviderResolutionResult,
  request: NormalizedPricingRequest,
): WidgetLaunchPackage {
  if (!provider.widgetUrl) {
    throw new Error('BOX widget URL is not configured.');
  }

  const launchUrl = buildLaunchUrl(provider.widgetUrl, {
    address: request.serviceAddress,
    usage: request.requestedUsage != null ? String(request.requestedUsage) : null,
    commodity: request.commodity,
    utility: request.utilityName,
    termMonths:
      request.requestedTermMonths != null ? String(request.requestedTermMonths) : null,
    pipelineId: request.pipelineId,
    pricingRequestId: request.pricingRequestId,
    provider: String(provider.providerKey),
  });

  return {
    providerKey: provider.providerKey,
    mode: 'widget',
    launchUrl,
    prefill: {
      serviceAddress: request.serviceAddress,
      usage: request.requestedUsage,
      commodity: request.commodity,
      utilityName: request.utilityName,
      termMonths: request.requestedTermMonths,
    },
    trackingContext: {
      pipelineId: request.pipelineId,
      relatedEntityId: request.pricingRequestId,
      relatedEntityType: 'pricing_request',
      providerKey: provider.providerKey,
    },
  };
}

function buildEnrollmentLaunchPackage(
  provider: ProviderResolutionResult,
  request: NormalizedEnrollmentRequest,
): WidgetLaunchPackage {
  if (!provider.widgetUrl) {
    throw new Error('BOX widget URL is not configured.');
  }

  const launchUrl = buildLaunchUrl(provider.widgetUrl, {
    pipelineId: request.pipelineId,
    enrollmentAttemptId: request.enrollmentAttemptId,
    provider: String(provider.providerKey),
    customerName: request.customerName,
    commodity: request.commodity,
    utility: request.utilityName,
    address: request.serviceAddress,
  });

  return {
    providerKey: provider.providerKey,
    mode: 'widget',
    launchUrl,
    prefill: {
      serviceAddress: request.serviceAddress,
      usage: null,
      commodity: request.commodity,
      utilityName: request.utilityName,
      termMonths: request.selectedQuote?.termMonths ?? null,
    },
    trackingContext: {
      pipelineId: request.pipelineId,
      relatedEntityId: request.enrollmentAttemptId,
      relatedEntityType: 'enrollment_attempt',
      providerKey: provider.providerKey,
    },
  };
}

export function startBoxWidgetPricingRequest(
  provider: ProviderResolutionResult,
  request: NormalizedPricingRequest,
): NormalizedPricingResponse {
  const launchPackage = buildPricingLaunchPackage(provider, request);

  return {
    providerKey: provider.providerKey,
    mode: provider.integrationMode,
    success: true,
    requiresManualOperator: true,
    launchUrl: launchPackage.launchUrl,
    externalReference: null,
    normalizedQuote: null,
    message:
      'BOX widget launch package created. Continue pricing inside the widget, then ingest the returned pricing result into NationsNRG.',
    rawPayload: {
      action: 'open_url',
      url: launchPackage.launchUrl,
      launchPackage,
      launchContext: {
        integration: 'box_widget_pricing',
        pipelineId: request.pipelineId,
        pricingRequestId: request.pricingRequestId,
      },
    },
  };
}

export function startBoxWidgetEnrollmentRequest(
  provider: ProviderResolutionResult,
  request: NormalizedEnrollmentRequest,
): NormalizedEnrollmentResponse {
  const launchPackage = buildEnrollmentLaunchPackage(provider, request);

  return {
    providerKey: provider.providerKey,
    mode: provider.integrationMode,
    success: true,
    requiresManualOperator: true,
    launchUrl: launchPackage.launchUrl,
    externalReference: null,
    normalizedStatus: null,
    message:
      'BOX widget enrollment launch package created. Continue the external enrollment flow, then ingest the returned enrollment result into NationsNRG.',
    rawPayload: {
      action: 'open_url',
      url: launchPackage.launchUrl,
      launchPackage,
      launchContext: {
        integration: 'box_widget_enrollment',
        pipelineId: request.pipelineId,
        enrollmentAttemptId: request.enrollmentAttemptId,
      },
    },
  };
}