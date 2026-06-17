import type {
  IntegrationAuthMode,
  IntegrationConfigStatus,
} from '../shared/types'

export type AppDirectConfig = {
  baseUrl: string
  authMode: Exclude<IntegrationAuthMode, 'none' | 'api_key' | 'username_password'>
  clientId: string | null
  clientSecret: string | null
  apiToken: string | null
  marketplaceId: string | null
  timeoutMs: number
}

export type AppDirectConfigPreview = {
  configured: boolean
  baseUrl: string | null
  authMode: IntegrationAuthMode
  hasClientId: boolean
  hasClientSecret: boolean
  hasApiToken: boolean
  marketplaceId: string | null
  timeoutMs: number
}

function normalizeString(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseInteger(value: string | undefined, fallback: number): number {
  const normalized = normalizeString(value)

  if (!normalized) {
    return fallback
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

function getAppDirectAuthMode(): IntegrationAuthMode {
  const apiToken = normalizeString(process.env.APPDIRECT_API_TOKEN)
  const clientId = normalizeString(process.env.APPDIRECT_CLIENT_ID)
  const clientSecret = normalizeString(process.env.APPDIRECT_CLIENT_SECRET)

  if (apiToken) {
    return 'api_token'
  }

  if (clientId && clientSecret) {
    return 'client_credentials'
  }

  return 'none'
}

export function getAppDirectConfigStatus(): IntegrationConfigStatus<AppDirectConfigPreview> {
  const baseUrl = normalizeString(process.env.APPDIRECT_BASE_URL)
  const marketplaceId =
    normalizeString(process.env.APPDIRECT_MARKETPLACE_ID) || null
  const authMode = getAppDirectAuthMode()
  const timeoutMs = parseInteger(process.env.APPDIRECT_TIMEOUT_MS, 15000)

  const missing: string[] = []

  if (!baseUrl) {
    missing.push('APPDIRECT_BASE_URL')
  }

  if (authMode === 'none') {
    missing.push('APPDIRECT_API_TOKEN or APPDIRECT_CLIENT_ID + APPDIRECT_CLIENT_SECRET')
  }

  const configured = Boolean(baseUrl) && authMode !== 'none'

  return {
    configured,
    missing,
    preview: {
      configured,
      baseUrl: baseUrl || null,
      authMode,
      hasClientId: Boolean(normalizeString(process.env.APPDIRECT_CLIENT_ID)),
      hasClientSecret: Boolean(
        normalizeString(process.env.APPDIRECT_CLIENT_SECRET)
      ),
      hasApiToken: Boolean(normalizeString(process.env.APPDIRECT_API_TOKEN)),
      marketplaceId,
      timeoutMs,
    },
  }
}

export function getAppDirectConfig(): AppDirectConfig {
  const baseUrl = normalizeString(process.env.APPDIRECT_BASE_URL)
  const authMode = getAppDirectAuthMode()

  if (!baseUrl) {
    throw new Error('Missing APPDIRECT_BASE_URL.')
  }

  if (authMode === 'none' || authMode === 'api_key' || authMode === 'username_password') {
    throw new Error(
      'AppDirect auth is not configured. Set APPDIRECT_API_TOKEN or APPDIRECT_CLIENT_ID + APPDIRECT_CLIENT_SECRET.'
    )
  }

  return {
    baseUrl,
    authMode,
    clientId: normalizeString(process.env.APPDIRECT_CLIENT_ID) || null,
    clientSecret: normalizeString(process.env.APPDIRECT_CLIENT_SECRET) || null,
    apiToken: normalizeString(process.env.APPDIRECT_API_TOKEN) || null,
    marketplaceId:
      normalizeString(process.env.APPDIRECT_MARKETPLACE_ID) || null,
    timeoutMs: parseInteger(process.env.APPDIRECT_TIMEOUT_MS, 15000),
  }
}