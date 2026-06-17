import type { Json } from '@/types/supabase';

export const INTEGRATION_MODES = [
  'widget',
  'api',
  'manual_email',
  'manual_portal',
  'manual_phone',
  'hybrid',
] as const;

export type IntegrationMode = (typeof INTEGRATION_MODES)[number];

export const PROVIDER_KEYS = [
  'box_widget',
  'box_api',
  'manual_florida_city_gas',
  'manual_generic',
] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export type ProviderCapabilityFlags = {
  supportsPricingRequest: boolean;
  supportsPricingResult: boolean;
  supportsEnrollmentSubmit: boolean;
  supportsEnrollmentStatus: boolean;
  requiresManualOperator: boolean;
  supportsWidgetLaunch: boolean;
};

export type SupplierIntegrationRecord = {
  id: string;
  supplierName: string;
  providerKey: ProviderKey | string;
  integrationMode: IntegrationMode;
  pricingSupported: boolean;
  enrollmentSupported: boolean;
  widgetUrl: string | null;
  apiBaseUrl: string | null;
  authType: string | null;
  status: 'active' | 'inactive' | 'testing' | 'deprecated';
  metadata: Json;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedPricingRequest = {
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
  executionMetadata?: Json;
};

export type NormalizedPricingResponse = {
  providerKey: ProviderKey | string;
  mode: IntegrationMode;
  success: boolean;
  requiresManualOperator: boolean;
  launchUrl?: string | null;
  externalReference?: string | null;
  normalizedQuote?: {
    supplierName: string | null;
    utilityName: string | null;
    commodity: string | null;
    rate: number | null;
    rateUnit: string | null;
    termMonths: number | null;
    estimatedMonthlySavings: number | null;
    estimatedAnnualSavings: number | null;
    validUntil: string | null;
    rawPayload?: Json;
  } | null;
  message: string;
  rawPayload?: Json;
};

export type NormalizedEnrollmentRequest = {
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
  executionMetadata?: Json;
};

export type NormalizedEnrollmentResponse = {
  providerKey: ProviderKey | string;
  mode: IntegrationMode;
  success: boolean;
  requiresManualOperator: boolean;
  launchUrl?: string | null;
  externalReference?: string | null;
  normalizedStatus?: {
    status: string | null;
    failureReason: string | null;
    rawPayload?: Json;
  } | null;
  message: string;
  rawPayload?: Json;
};

export type WidgetLaunchPackage = {
  providerKey: ProviderKey | string;
  mode: 'widget';
  launchUrl: string;
  prefill: {
    serviceAddress: string | null;
    usage: number | null;
    commodity: string | null;
    utilityName: string | null;
    termMonths: number | null;
  };
  trackingContext: {
    pipelineId: string;
    relatedEntityId: string;
    relatedEntityType: 'pricing_request' | 'enrollment_attempt';
    providerKey: ProviderKey | string;
  };
};

export type ManualExecutionInstruction = {
  providerKey: ProviderKey | string;
  mode: 'manual_email' | 'manual_portal' | 'manual_phone';
  requiresManualOperator: true;
  message: string;
  nextStepLabel: string;
  payload: Json;
};

export type ProviderResolutionResult = {
  supplierName: string;
  providerKey: ProviderKey | string;
  integrationMode: IntegrationMode;
  capabilities: ProviderCapabilityFlags;
  widgetUrl: string | null;
  apiBaseUrl: string | null;
  authType: string | null;
  metadata: Json;
};