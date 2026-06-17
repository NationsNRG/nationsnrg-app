import type {
  BoxWidgetMode,
  IntegrationAuthMode,
  IntegrationConfigStatus,
} from '../shared/types'

export type BoxWidgetConfig = {
  mode: Extract<BoxWidgetMode, 'script'>
  scriptSrc: string
  apiKey: string
  widgetType: string
  scriptId: string
  containerId: string
  heightPx: number
}

export type BoxApiConfig = {
  baseUrl: string
  authMode: Exclude<
    IntegrationAuthMode,
    'none' | 'client_credentials' | 'api_token'
  >
  apiKey: string | null
  username: string | null
  password: string | null
  timeoutMs: number
  apiKeyHeaderName: string
}

export type BoxConfigPreview = {
  configured: boolean
  widgetReady: boolean
  widgetMode: BoxWidgetMode
  scriptSrc: string | null
  widgetType: string | null
  scriptId: string
  containerId: string
  heightPx: number
  hasWidgetApiKey: boolean
  apiReady: boolean
  apiBaseUrl: string | null
  authMode: IntegrationAuthMode
  hasApiKey: boolean
  hasUsername: boolean
  hasPassword: boolean
  apiKeyHeaderName: string
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

function getBoxWidgetMode(): BoxWidgetMode {
  const scriptSrc = normalizeString(process.env.BOX_WIDGET_SCRIPT_SRC)
  const widgetApiKey = normalizeString(process.env.BOX_WIDGET_API_KEY)
  const widgetType = normalizeString(process.env.BOX_WIDGET_TYPE)

  if (scriptSrc && widgetApiKey && widgetType) {
    return 'script'
  }

  return 'unconfigured'
}

function getBoxApiAuthMode(): IntegrationAuthMode {
  const apiKey = normalizeString(process.env.BOX_API_KEY)
  const username = normalizeString(process.env.BOX_API_USERNAME)
  const password = normalizeString(process.env.BOX_API_PASSWORD)

  if (apiKey) {
    return 'api_key'
  }

  if (username && password) {
    return 'username_password'
  }

  return 'none'
}

export function getBoxConfigStatus(): IntegrationConfigStatus<BoxConfigPreview> {
  const scriptSrc = normalizeString(process.env.BOX_WIDGET_SCRIPT_SRC)
  const widgetType = normalizeString(process.env.BOX_WIDGET_TYPE)
  const widgetApiKey = normalizeString(process.env.BOX_WIDGET_API_KEY)
  const scriptId = normalizeString(process.env.BOX_WIDGET_SCRIPT_ID) || 'app'
  const containerId =
    normalizeString(process.env.BOX_WIDGET_CONTAINER_ID) || 'box-widget-root'
  const heightPx = parseInteger(process.env.BOX_WIDGET_HEIGHT_PX, 1100)

  const apiBaseUrl = normalizeString(process.env.BOX_API_BASE_URL)
  const authMode = getBoxApiAuthMode()
  const timeoutMs = parseInteger(process.env.BOX_TIMEOUT_MS, 15000)
  const apiKeyHeaderName =
    normalizeString(process.env.BOX_API_KEY_HEADER_NAME) || 'x-api-key'

  const widgetMode = getBoxWidgetMode()
  const widgetReady = widgetMode === 'script'
  const apiReady = Boolean(apiBaseUrl) && authMode !== 'none'

  const missing: string[] = []

  if (!scriptSrc) {
    missing.push('BOX_WIDGET_SCRIPT_SRC')
  }

  if (!widgetApiKey) {
    missing.push('BOX_WIDGET_API_KEY')
  }

  if (!widgetType) {
    missing.push('BOX_WIDGET_TYPE')
  }

  if (!apiBaseUrl) {
    missing.push('BOX_API_BASE_URL')
  }

  if (authMode === 'none') {
    missing.push('BOX_API_KEY or BOX_API_USERNAME + BOX_API_PASSWORD')
  }

  return {
    configured: widgetReady || apiReady,
    missing,
    preview: {
      configured: widgetReady || apiReady,
      widgetReady,
      widgetMode,
      scriptSrc: scriptSrc || null,
      widgetType: widgetType || null,
      scriptId,
      containerId,
      heightPx,
      hasWidgetApiKey: Boolean(widgetApiKey),
      apiReady,
      apiBaseUrl: apiBaseUrl || null,
      authMode,
      hasApiKey: Boolean(normalizeString(process.env.BOX_API_KEY)),
      hasUsername: Boolean(normalizeString(process.env.BOX_API_USERNAME)),
      hasPassword: Boolean(normalizeString(process.env.BOX_API_PASSWORD)),
      apiKeyHeaderName,
      timeoutMs,
    },
  }
}

export function getBoxWidgetConfig(): BoxWidgetConfig {
  const scriptSrc = normalizeString(process.env.BOX_WIDGET_SCRIPT_SRC)
  const apiKey = normalizeString(process.env.BOX_WIDGET_API_KEY)
  const widgetType = normalizeString(process.env.BOX_WIDGET_TYPE)
  const scriptId = normalizeString(process.env.BOX_WIDGET_SCRIPT_ID) || 'app'
  const containerId =
    normalizeString(process.env.BOX_WIDGET_CONTAINER_ID) || 'box-widget-root'
  const heightPx = parseInteger(process.env.BOX_WIDGET_HEIGHT_PX, 1100)

  if (!scriptSrc) {
    throw new Error('Missing BOX_WIDGET_SCRIPT_SRC.')
  }

  if (!apiKey) {
    throw new Error('Missing BOX_WIDGET_API_KEY.')
  }

  if (!widgetType) {
    throw new Error('Missing BOX_WIDGET_TYPE.')
  }

  return {
    mode: 'script',
    scriptSrc,
    apiKey,
    widgetType,
    scriptId,
    containerId,
    heightPx,
  }
}

export function getBoxApiConfig(): BoxApiConfig {
  const baseUrl = normalizeString(process.env.BOX_API_BASE_URL)
  const authMode = getBoxApiAuthMode()
  const apiKeyHeaderName =
    normalizeString(process.env.BOX_API_KEY_HEADER_NAME) || 'x-api-key'

  if (!baseUrl) {
    throw new Error('Missing BOX_API_BASE_URL.')
  }

  if (
    authMode === 'none' ||
    authMode === 'client_credentials' ||
    authMode === 'api_token'
  ) {
    throw new Error(
      'Broker Online Exchange API auth is not configured. Set BOX_API_KEY or BOX_API_USERNAME + BOX_API_PASSWORD.'
    )
  }

  return {
    baseUrl,
    authMode,
    apiKey: normalizeString(process.env.BOX_API_KEY) || null,
    username: normalizeString(process.env.BOX_API_USERNAME) || null,
    password: normalizeString(process.env.BOX_API_PASSWORD) || null,
    timeoutMs: parseInteger(process.env.BOX_TIMEOUT_MS, 15000),
    apiKeyHeaderName,
  }
}