import { getBoxApiConfig } from './config'
import {
  buildBasicAuthHeader,
  fetchWithTimeout,
  joinUrl,
  normalizeString,
  parseHttpResponseBody,
} from '../shared/http'

export type BoxConnectivityResult = {
  configured: boolean
  reachable: boolean
  ok: boolean
  status: number | null
  url: string | null
  authMode: string | null
  bodyKind: 'json' | 'text' | 'empty' | null
  bodyPreview: string | null
  json: unknown | null
  error: string | null
}

export type BoxApiCallResult = {
  ok: boolean
  status: number
  url: string
  bodyKind: 'json' | 'text' | 'empty'
  bodyPreview: string | null
  json: unknown | null
}

function getBoxApiTestPath(): string {
  return normalizeString(process.env.BOX_API_TEST_PATH) || '/'
}

function getBoxPricingPath(): string {
  return normalizeString(process.env.BOX_PRICING_PATH)
}

function getBoxEnrollmentPath(): string {
  return normalizeString(process.env.BOX_ENROLLMENT_PATH)
}

function getBoxEnrollmentStatusPath(): string {
  return normalizeString(process.env.BOX_ENROLLMENT_STATUS_PATH)
}

function getBoxApiKeyHeaderName(): string {
  return normalizeString(process.env.BOX_API_KEY_HEADER_NAME) || 'x-api-key'
}

function buildBoxHeaders(): HeadersInit {
  const config = getBoxApiConfig()

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (config.authMode === 'username_password') {
    if (!config.username || !config.password) {
      throw new Error(
        'Broker Online Exchange username/password auth requires username and password.'
      )
    }

    headers.Authorization = `Basic ${buildBasicAuthHeader(
      config.username,
      config.password
    )}`
  }

  if (config.authMode === 'api_key') {
    if (!config.apiKey) {
      throw new Error('Broker Online Exchange API key auth requires an API key.')
    }

    headers[getBoxApiKeyHeaderName()] = config.apiKey
  }

  return headers
}

async function performBoxJsonRequest(
  path: string,
  payload: Record<string, unknown>
): Promise<BoxApiCallResult> {
  const config = getBoxApiConfig()

  if (!path) {
    throw new Error('Missing Broker Online Exchange endpoint path.')
  }

  const url = joinUrl(config.baseUrl, path)
  const headers = buildBoxHeaders()

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
    config.timeoutMs
  )

  const parsed = await parseHttpResponseBody(response)

  return {
    ok: response.ok,
    status: response.status,
    url,
    bodyKind: parsed.kind,
    bodyPreview: parsed.text,
    json: parsed.json,
  }
}

export async function testBoxApiConnectivity(): Promise<BoxConnectivityResult> {
  try {
    const config = getBoxApiConfig()
    const url = joinUrl(config.baseUrl, getBoxApiTestPath())
    const headers = buildBoxHeaders()

    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers,
      },
      config.timeoutMs
    )

    const parsed = await parseHttpResponseBody(response)

    return {
      configured: true,
      reachable: true,
      ok: response.ok,
      status: response.status,
      url,
      authMode: config.authMode,
      bodyKind: parsed.kind,
      bodyPreview: parsed.text,
      json: parsed.json,
      error: null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    const isConfigError =
      message.includes('Missing BOX_API_BASE_URL') ||
      message.includes('Broker Online Exchange API auth is not configured')

    return {
      configured: !isConfigError,
      reachable: false,
      ok: false,
      status: null,
      url: null,
      authMode: null,
      bodyKind: null,
      bodyPreview: null,
      json: null,
      error: message,
    }
  }
}

export async function lookupBoxPricing(
  payload: Record<string, unknown>
): Promise<BoxApiCallResult> {
  const path = getBoxPricingPath()

  if (!path) {
    throw new Error(
      'Missing BOX_PRICING_PATH. Add the pricing endpoint path to .env.local.'
    )
  }

  return performBoxJsonRequest(path, payload)
}

export async function submitBoxEnrollment(
  payload: Record<string, unknown>
): Promise<BoxApiCallResult> {
  const path = getBoxEnrollmentPath()

  if (!path) {
    throw new Error(
      'Missing BOX_ENROLLMENT_PATH. Add the enrollment endpoint path to .env.local.'
    )
  }

  return performBoxJsonRequest(path, payload)
}

export async function getBoxEnrollmentStatus(
  payload: Record<string, unknown>
): Promise<BoxApiCallResult> {
  const path = getBoxEnrollmentStatusPath()

  if (!path) {
    throw new Error(
      'Missing BOX_ENROLLMENT_STATUS_PATH. Add the enrollment status endpoint path to .env.local.'
    )
  }

  return performBoxJsonRequest(path, payload)
}