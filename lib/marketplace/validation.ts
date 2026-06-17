import type {
  EnrollmentRequestBody,
  EnrollmentStatusRequestBody,
  MarketplaceCommodity,
  MarketplaceCustomerType,
  MarketplaceProvider,
  NormalizedEnrollmentRequest,
  NormalizedEnrollmentStatusRequest,
  NormalizedPricingRequest,
  PricingRequestBody,
} from './types'

type ValidationResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: string
    }

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value)
  return normalized.length > 0 ? normalized : null
}

function parseNullablePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function isMarketplaceProvider(value: string): value is MarketplaceProvider {
  return value === 'box'
}

function isCommodity(value: string): value is MarketplaceCommodity {
  return value === 'electricity' || value === 'natural_gas'
}

function isCustomerType(value: string): value is MarketplaceCustomerType {
  return value === 'commercial' || value === 'residential'
}

function isValidEmail(value: string | null): boolean {
  if (!value) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validatePricingRequest(
  body: PricingRequestBody
): ValidationResult<NormalizedPricingRequest> {
  const provider = normalizeString(body.provider)
  const commodity = normalizeString(body.commodity)
  const customerType = normalizeString(body.customerType)

  if (!isMarketplaceProvider(provider)) {
    return {
      ok: false,
      error: 'provider must be "box".',
    }
  }

  if (!isCommodity(commodity)) {
    return {
      ok: false,
      error: 'commodity must be "electricity" or "natural_gas".',
    }
  }

  if (!isCustomerType(customerType)) {
    return {
      ok: false,
      error: 'customerType must be "commercial" or "residential".',
    }
  }

  const annualUsage = parseNullablePositiveNumber(body.annualUsage)
  const averageMonthlyBill = parseNullablePositiveNumber(body.averageMonthlyBill)

  if (!annualUsage && !averageMonthlyBill) {
    return {
      ok: false,
      error: 'Provide annualUsage or averageMonthlyBill.',
    }
  }

  const email = normalizeNullableString(body.email)

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: 'email must be valid when provided.',
    }
  }

  return {
    ok: true,
    value: {
      provider,
      commodity,
      customerType,
      state: normalizeNullableString(body.state),
      zipCode: normalizeNullableString(body.zipCode),
      utility: normalizeNullableString(body.utility),
      annualUsage,
      averageMonthlyBill,
      businessName: normalizeNullableString(body.businessName),
      contactName: normalizeNullableString(body.contactName),
      email,
      phone: normalizeNullableString(body.phone),
      metadata: normalizeMetadata(body.metadata),
    },
  }
}

export function validateEnrollmentRequest(
  body: EnrollmentRequestBody
): ValidationResult<NormalizedEnrollmentRequest> {
  const provider = normalizeString(body.provider)
  const commodity = normalizeString(body.commodity)
  const customerType = normalizeString(body.customerType)

  if (!isMarketplaceProvider(provider)) {
    return {
      ok: false,
      error: 'provider must be "box".',
    }
  }

  if (!isCommodity(commodity)) {
    return {
      ok: false,
      error: 'commodity must be "electricity" or "natural_gas".',
    }
  }

  if (!isCustomerType(customerType)) {
    return {
      ok: false,
      error: 'customerType must be "commercial" or "residential".',
    }
  }

  const offerId = normalizeNullableString(body.offerId)
  const planCode = normalizeNullableString(body.planCode)

  if (!offerId && !planCode) {
    return {
      ok: false,
      error: 'Provide offerId or planCode.',
    }
  }

  const email = normalizeNullableString(body.email)

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: 'email must be valid when provided.',
    }
  }

  return {
    ok: true,
    value: {
      provider,
      commodity,
      customerType,
      offerId,
      planCode,
      utility: normalizeNullableString(body.utility),
      annualUsage: parseNullablePositiveNumber(body.annualUsage),
      averageMonthlyBill: parseNullablePositiveNumber(body.averageMonthlyBill),
      businessName: normalizeNullableString(body.businessName),
      contactName: normalizeNullableString(body.contactName),
      email,
      phone: normalizeNullableString(body.phone),
      serviceAddress: normalizeNullableString(body.serviceAddress),
      metadata: normalizeMetadata(body.metadata),
    },
  }
}

export function validateEnrollmentStatusRequest(
  body: EnrollmentStatusRequestBody
): ValidationResult<NormalizedEnrollmentStatusRequest> {
  const provider = normalizeString(body.provider)

  if (!isMarketplaceProvider(provider)) {
    return {
      ok: false,
      error: 'provider must be "box".',
    }
  }

  const enrollmentId = normalizeNullableString(body.enrollmentId)
  const contractId = normalizeNullableString(body.contractId)
  const externalId = normalizeNullableString(body.externalId)

  if (!enrollmentId && !contractId && !externalId) {
    return {
      ok: false,
      error: 'Provide enrollmentId, contractId, or externalId.',
    }
  }

  return {
    ok: true,
    value: {
      provider,
      enrollmentId,
      contractId,
      externalId,
      metadata: normalizeMetadata(body.metadata),
    },
  }
}