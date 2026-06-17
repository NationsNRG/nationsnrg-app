export const DISTRIBUTION_PERFORMANCE_FIELDS = [
  'clicks',
  'impressions',
  'engagement',
  'replies',
  'conversions',
  'booked_consultations',
  'bill_uploads',
] as const

export type DistributionPerformanceField =
  (typeof DISTRIBUTION_PERFORMANCE_FIELDS)[number]

export type DistributionPerformance = Record<DistributionPerformanceField, number>

export const DEFAULT_DISTRIBUTION_PERFORMANCE: DistributionPerformance = {
  clicks: 0,
  impressions: 0,
  engagement: 0,
  replies: 0,
  conversions: 0,
  booked_consultations: 0,
  bill_uploads: 0,
}

function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

export function normalizeDistributionPerformance(
  value: unknown
): DistributionPerformance {
  const normalized: DistributionPerformance = {
    ...DEFAULT_DISTRIBUTION_PERFORMANCE,
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return normalized
  }

  const record = value as Record<string, unknown>

  for (const field of DISTRIBUTION_PERFORMANCE_FIELDS) {
    const parsed = parseNumberish(record[field])

    if (parsed !== null && parsed >= 0) {
      normalized[field] = parsed
    }
  }

  return normalized
}

export function sanitizeDistributionPerformancePatch(value: unknown): {
  patch: Partial<DistributionPerformance> | null
  error: string | null
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      patch: null,
      error: 'performance must be an object.',
    }
  }

  const record = value as Record<string, unknown>
  const patch: Partial<DistributionPerformance> = {}

  for (const field of DISTRIBUTION_PERFORMANCE_FIELDS) {
    if (!(field in record)) {
      continue
    }

    const parsed = parseNumberish(record[field])

    if (parsed === null || parsed < 0) {
      return {
        patch: null,
        error: `performance.${field} must be a non-negative number.`,
      }
    }

    patch[field] = parsed
  }

  return {
    patch,
    error: null,
  }
}

export function mergeDistributionPerformance(
  base: DistributionPerformance,
  patch: Partial<DistributionPerformance>
): DistributionPerformance {
  return {
    ...base,
    ...patch,
  }
}

export function formatPerformanceMetricLabel(
  field: DistributionPerformanceField
): string {
  switch (field) {
    case 'clicks':
      return 'Clicks'
    case 'impressions':
      return 'Impressions'
    case 'engagement':
      return 'Engagement'
    case 'replies':
      return 'Replies'
    case 'conversions':
      return 'Conversions'
    case 'booked_consultations':
      return 'Booked Consultations'
    case 'bill_uploads':
      return 'Bill Uploads'
    default:
      return field
  }
}