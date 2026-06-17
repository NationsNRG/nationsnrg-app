import type { Json } from '@/types/supabase';
import type {
  IntegrationMode,
  ProviderCapabilityFlags,
  ProviderKey,
  ProviderResolutionResult,
} from '@/lib/integrations/types';

type ProviderDefinition = {
  providerKey: ProviderKey | string;
  displayName: string;
  integrationMode: IntegrationMode;
  capabilities: ProviderCapabilityFlags;
  widgetUrl?: string | null;
  apiBaseUrl?: string | null;
  authType?: string | null;
  metadata?: Json;
};

const PROVIDER_REGISTRY: Record<string, ProviderDefinition> = {
  box_widget: {
    providerKey: 'box_widget',
    displayName: 'BOX / AppDirect Widget',
    integrationMode: 'widget',
    capabilities: {
      supportsPricingRequest: true,
      supportsPricingResult: false,
      supportsEnrollmentSubmit: false,
      supportsEnrollmentStatus: false,
      requiresManualOperator: true,
      supportsWidgetLaunch: true,
    },
    widgetUrl: 'https://save.brokeronlinexchange.com/nationsnrg',
    metadata: {
      notes: 'Embedded widget pricing path for near-term tracked execution.',
    },
  },

  box_api: {
    providerKey: 'box_api',
    displayName: 'BOX / AppDirect API',
    integrationMode: 'api',
    capabilities: {
      supportsPricingRequest: true,
      supportsPricingResult: true,
      supportsEnrollmentSubmit: true,
      supportsEnrollmentStatus: true,
      requiresManualOperator: false,
      supportsWidgetLaunch: false,
    },
    apiBaseUrl: null,
    authType: null,
    metadata: {
      notes: 'Reserved for direct API integration once credentials and docs are available.',
    },
  },

  manual_florida_city_gas: {
    providerKey: 'manual_florida_city_gas',
    displayName: 'Florida City Gas Manual Workflow',
    integrationMode: 'manual_email',
    capabilities: {
      supportsPricingRequest: true,
      supportsPricingResult: false,
      supportsEnrollmentSubmit: true,
      supportsEnrollmentStatus: false,
      requiresManualOperator: true,
      supportsWidgetLaunch: false,
    },
    metadata: {
      notes: 'Manual supplier workflow pending direct integration.',
    },
  },

  manual_generic: {
    providerKey: 'manual_generic',
    displayName: 'Generic Manual Workflow',
    integrationMode: 'manual_email',
    capabilities: {
      supportsPricingRequest: true,
      supportsPricingResult: false,
      supportsEnrollmentSubmit: true,
      supportsEnrollmentStatus: false,
      requiresManualOperator: true,
      supportsWidgetLaunch: false,
    },
    metadata: {
      notes: 'Fallback provider when no supplier-specific integration exists.',
    },
  },
};

function normalizeSupplierName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function getProviderDefinition(providerKey: string): ProviderDefinition | null {
  return PROVIDER_REGISTRY[providerKey] ?? null;
}

export function resolveProviderKeyForSupplier(supplierName: string | null | undefined): ProviderKey | string {
  const normalized = normalizeSupplierName(supplierName);

  if (normalized.includes('box') || normalized.includes('appdirect') || normalized.includes('broker online exchange')) {
    return 'box_widget';
  }

  if (normalized.includes('florida city gas')) {
    return 'manual_florida_city_gas';
  }

  return 'manual_generic';
}

export function resolveProviderForSupplier(
  supplierName: string | null | undefined,
): ProviderResolutionResult {
  const providerKey = resolveProviderKeyForSupplier(supplierName);
  const provider = getProviderDefinition(providerKey);

  if (!provider) {
    throw new Error(`No provider definition found for ${providerKey}.`);
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