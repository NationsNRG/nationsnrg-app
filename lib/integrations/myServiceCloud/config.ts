import type {
  IntegrationAuthMode,
  IntegrationConfigStatus,
} from '../shared/types'

export type MyServiceCloudConfig = {
  baseUrl: string
  authMode: Exclude<
    IntegrationAuthMode,
    'none' | 'api_key' | 'client_credentials'
  >
  username: string | null
  password: string | null
  apiToken: string | null
  tenantId: string | null
  loginPath: string
  loginMethod: 'GET' | 'POST'
  emailField: string
  passwordField: string
  requestEncoding: 'form' | 'json'
  csrfField: string
  csrfMetaName: string | null
  useCsrfHeader: boolean
  successPath: string | null
  timeoutMs: number
}

export type MyServiceCloudConfigPreview = {
  configured: boolean
  baseUrl: string | null
  authMode: IntegrationAuthMode
  username: string | null
  hasPassword: boolean
  hasApiToken: boolean
  tenantId: string | null
  loginPath: string
  loginMethod: 'GET' | 'POST'
  emailField: string
  passwordField: string
  requestEncoding: 'form' | 'json'
  csrfField: string
  csrfMetaName: string | null
  useCsrfHeader: boolean
  successPath: string | null
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

function normalizeHttpMethod(value: string | undefined): 'GET' | 'POST' {
  const normalized = normalizeString(value).toUpperCase()

  return normalized === 'GET' ? 'GET' : 'POST'
}

function normalizeRequestEncoding(
  value: string | undefined
): 'form' | 'json' {
  const normalized = normalizeString(value).toLowerCase()

  return normalized === 'json' ? 'json' : 'form'
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = normalizeString(value).toLowerCase()

  if (!normalized) {
    return fallback
  }

  if (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  ) {
    return true
  }

  if (
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === 'off'
  ) {
    return false
  }

  return fallback
}

function getMyServiceCloudAuthMode(): IntegrationAuthMode {
  const apiToken = normalizeString(process.env.MY_SERVICE_CLOUD_API_TOKEN)
  const username = normalizeString(process.env.MY_SERVICE_CLOUD_USERNAME)
  const password = normalizeString(process.env.MY_SERVICE_CLOUD_PASSWORD)

  if (apiToken) {
    return 'api_token'
  }

  if (username && password) {
    return 'username_password'
  }

  return 'none'
}

function getLoginPath(): string {
  const normalized = normalizeString(process.env.MY_SERVICE_CLOUD_LOGIN_PATH)

  if (!normalized) {
    return '/sign-in'
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function getMyServiceCloudConfigStatus(): IntegrationConfigStatus<MyServiceCloudConfigPreview> {
  const baseUrl = normalizeString(process.env.MY_SERVICE_CLOUD_BASE_URL)
  const username = normalizeString(process.env.MY_SERVICE_CLOUD_USERNAME)
  const tenantId =
    normalizeString(process.env.MY_SERVICE_CLOUD_TENANT_ID) || null
  const authMode = getMyServiceCloudAuthMode()
  const timeoutMs = parseInteger(
    process.env.MY_SERVICE_CLOUD_TIMEOUT_MS,
    15000
  )
  const loginPath = getLoginPath()
  const loginMethod = normalizeHttpMethod(
    process.env.MY_SERVICE_CLOUD_LOGIN_METHOD
  )
  const emailField =
    normalizeString(process.env.MY_SERVICE_CLOUD_EMAIL_FIELD) || 'email'
  const passwordField =
    normalizeString(process.env.MY_SERVICE_CLOUD_PASSWORD_FIELD) || 'password'
  const requestEncoding = normalizeRequestEncoding(
    process.env.MY_SERVICE_CLOUD_REQUEST_ENCODING
  )
  const csrfField =
    normalizeString(process.env.MY_SERVICE_CLOUD_CSRF_FIELD) || '_token'
  const csrfMetaName =
    normalizeString(process.env.MY_SERVICE_CLOUD_CSRF_META_NAME) ||
    'csrf-token'
  const useCsrfHeader = parseBoolean(
    process.env.MY_SERVICE_CLOUD_USE_CSRF_HEADER,
    true
  )
  const successPath =
    normalizeString(process.env.MY_SERVICE_CLOUD_SUCCESS_PATH) || null

  const missing: string[] = []

  if (!baseUrl) {
    missing.push('MY_SERVICE_CLOUD_BASE_URL')
  }

  if (authMode === 'none') {
    missing.push(
      'MY_SERVICE_CLOUD_API_TOKEN or MY_SERVICE_CLOUD_USERNAME + MY_SERVICE_CLOUD_PASSWORD'
    )
  }

  const configured = Boolean(baseUrl) && authMode !== 'none'

  return {
    configured,
    missing,
    preview: {
      configured,
      baseUrl: baseUrl || null,
      authMode,
      username: username || null,
      hasPassword: Boolean(
        normalizeString(process.env.MY_SERVICE_CLOUD_PASSWORD)
      ),
      hasApiToken: Boolean(
        normalizeString(process.env.MY_SERVICE_CLOUD_API_TOKEN)
      ),
      tenantId,
      loginPath,
      loginMethod,
      emailField,
      passwordField,
      requestEncoding,
      csrfField,
      csrfMetaName: csrfMetaName || null,
      useCsrfHeader,
      successPath,
      timeoutMs,
    },
  }
}

export function getMyServiceCloudConfig(): MyServiceCloudConfig {
  const baseUrl = normalizeString(process.env.MY_SERVICE_CLOUD_BASE_URL)
  const authMode = getMyServiceCloudAuthMode()

  if (!baseUrl) {
    throw new Error('Missing MY_SERVICE_CLOUD_BASE_URL.')
  }

  if (
    authMode === 'none' ||
    authMode === 'api_key' ||
    authMode === 'client_credentials'
  ) {
    throw new Error(
      'My Service Cloud auth is not configured. Set MY_SERVICE_CLOUD_API_TOKEN or MY_SERVICE_CLOUD_USERNAME + MY_SERVICE_CLOUD_PASSWORD.'
    )
  }

  return {
    baseUrl,
    authMode,
    username: normalizeString(process.env.MY_SERVICE_CLOUD_USERNAME) || null,
    password: normalizeString(process.env.MY_SERVICE_CLOUD_PASSWORD) || null,
    apiToken: normalizeString(process.env.MY_SERVICE_CLOUD_API_TOKEN) || null,
    tenantId:
      normalizeString(process.env.MY_SERVICE_CLOUD_TENANT_ID) || null,
    loginPath: getLoginPath(),
    loginMethod: normalizeHttpMethod(
      process.env.MY_SERVICE_CLOUD_LOGIN_METHOD
    ),
    emailField:
      normalizeString(process.env.MY_SERVICE_CLOUD_EMAIL_FIELD) || 'email',
    passwordField:
      normalizeString(process.env.MY_SERVICE_CLOUD_PASSWORD_FIELD) || 'password',
    requestEncoding: normalizeRequestEncoding(
      process.env.MY_SERVICE_CLOUD_REQUEST_ENCODING
    ),
    csrfField:
      normalizeString(process.env.MY_SERVICE_CLOUD_CSRF_FIELD) || '_token',
    csrfMetaName:
      normalizeString(process.env.MY_SERVICE_CLOUD_CSRF_META_NAME) ||
      'csrf-token',
    useCsrfHeader: parseBoolean(
      process.env.MY_SERVICE_CLOUD_USE_CSRF_HEADER,
      true
    ),
    successPath:
      normalizeString(process.env.MY_SERVICE_CLOUD_SUCCESS_PATH) || null,
    timeoutMs: parseInteger(process.env.MY_SERVICE_CLOUD_TIMEOUT_MS, 15000),
  }
}