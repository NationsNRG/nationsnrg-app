import type {
  CreatePublicPricingIntakeRequestBody,
  NormalizedPublicPricingIntakeRequest,
  PublicPricingCommodity,
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

function parseNullableNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed >= 0) {
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

function isCommodity(value: string): value is PublicPricingCommodity {
  return (
    value === 'electricity' ||
    value === 'natural_gas' ||
    value === 'other'
  )
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidZip(value: string | null): boolean {
  if (!value) {
    return false
  }

  return /^\d{5}(?:-\d{4})?$/.test(value)
}

export function validateCreatePublicPricingIntake(
  body: CreatePublicPricingIntakeRequestBody
): ValidationResult<NormalizedPublicPricingIntakeRequest> {
  const companyName = normalizeNullableString(body.companyName)
  const contactName = normalizeNullableString(body.contactName)
  const email = normalizeString(body.email)
  const phone = normalizeNullableString(body.phone)
  const state = normalizeNullableString(body.state)
  const zipCode = normalizeNullableString(body.zipCode)
  const utility = normalizeNullableString(body.utility)
  const averageMonthlyBill = parseNullableNonNegativeNumber(body.averageMonthlyBill)
  const averageMonthlyUsage = parseNullableNonNegativeNumber(body.averageMonthlyUsage)
  const commodity = normalizeString(body.commodity) || 'electricity'
  const notes = normalizeNullableString(body.notes)
  const metadata = normalizeMetadata(body.metadata)

  if (!companyName && !contactName) {
    return {
      ok: false,
      error: 'Provide companyName or contactName.',
    }
  }

  if (!email || !isValidEmail(email)) {
    return {
      ok: false,
      error: 'A valid email is required.',
    }
  }

  if (!isValidZip(zipCode)) {
    return {
      ok: false,
      error: 'A valid zipCode is required.',
    }
  }

  if (
    body.averageMonthlyBill !== undefined &&
    body.averageMonthlyBill !== null &&
    averageMonthlyBill === null
  ) {
    return {
      ok: false,
      error: 'averageMonthlyBill must be a non-negative number.',
    }
  }

  if (
    body.averageMonthlyUsage !== undefined &&
    body.averageMonthlyUsage !== null &&
    averageMonthlyUsage === null
  ) {
    return {
      ok: false,
      error: 'averageMonthlyUsage must be a non-negative number.',
    }
  }

  if (!isCommodity(commodity)) {
    return {
      ok: false,
      error: 'commodity must be electricity, natural_gas, or other.',
    }
  }

  return {
    ok: true,
    value: {
      companyName,
      contactName,
      email,
      phone,
      state,
      zipCode,
      utility,
      averageMonthlyBill,
      averageMonthlyUsage,
      commodity,
      notes,
      metadata,
    },
  }
}