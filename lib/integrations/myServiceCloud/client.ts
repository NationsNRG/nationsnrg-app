import { getMyServiceCloudConfig } from './config'
import {
  fetchWithTimeout,
  joinUrl,
  parseHttpResponseBody,
} from '../shared/http'

export type MyServiceCloudConnectivityResult = {
  configured: boolean
  reachable: boolean
  ok: boolean
  preflightStatus: number | null
  loginStatus: number | null
  loginUrl: string | null
  authMode: string | null
  requestMethod: 'GET' | 'POST' | null
  requestEncoding: 'form' | 'json' | null
  extractedCsrfToken: boolean
  csrfSource: 'input' | 'meta' | null
  bodyKind: 'json' | 'text' | 'empty' | null
  bodyPreview: string | null
  json: unknown | null
  redirectedTo: string | null
  initialCookieCount: number
  finalCookieCount: number
  error: string | null
}

type CookieJar = Map<string, string>

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitSetCookieHeader(headerValue: string): string[] {
  const parts: string[] = []
  let current = ''
  let inExpires = false

  for (let index = 0; index < headerValue.length; index += 1) {
    const char = headerValue[index]
    const nextChunk = headerValue.slice(index, index + 8).toLowerCase()

    if (nextChunk === 'expires=') {
      inExpires = true
    }

    if (char === ',' && !inExpires) {
      parts.push(current.trim())
      current = ''
      continue
    }

    if (inExpires && char === ';') {
      inExpires = false
    }

    current += char
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

function getSetCookieValues(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const combined = response.headers.get('set-cookie')

  if (!combined) {
    return []
  }

  return splitSetCookieHeader(combined)
}

function cookieJarFromSetCookieHeaders(setCookies: string[]): CookieJar {
  const jar: CookieJar = new Map()

  for (const entry of setCookies) {
    const cookiePair = entry.split(';', 1)[0]
    const separatorIndex = cookiePair.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const name = cookiePair.slice(0, separatorIndex).trim()
    const value = cookiePair.slice(separatorIndex + 1).trim()

    if (!name) {
      continue
    }

    jar.set(name, value)
  }

  return jar
}

function mergeCookieJars(base: CookieJar, incoming: CookieJar): CookieJar {
  const merged: CookieJar = new Map(base)

  for (const [key, value] of incoming.entries()) {
    merged.set(key, value)
  }

  return merged
}

function cookieJarToHeader(jar: CookieJar): string | null {
  const entries = Array.from(jar.entries())

  if (entries.length === 0) {
    return null
  }

  return entries.map(([key, value]) => `${key}=${value}`).join('; ')
}

function extractCsrfToken(params: {
  html: string | null
  csrfField: string
  csrfMetaName: string | null
}): {
  token: string | null
  source: 'input' | 'meta' | null
} {
  const html = params.html ?? ''

  if (!html) {
    return {
      token: null,
      source: null,
    }
  }

  const inputPattern = new RegExp(
    `<input[^>]+name=["']${escapeRegExp(
      params.csrfField
    )}["'][^>]+value=["']([^"']+)["']`,
    'i'
  )

  const inputMatch = html.match(inputPattern)

  if (inputMatch?.[1]) {
    return {
      token: inputMatch[1],
      source: 'input',
    }
  }

  if (params.csrfMetaName) {
    const metaPattern = new RegExp(
      `<meta[^>]+name=["']${escapeRegExp(
        params.csrfMetaName
      )}["'][^>]+content=["']([^"']+)["']`,
      'i'
    )

    const metaMatch = html.match(metaPattern)

    if (metaMatch?.[1]) {
      return {
        token: metaMatch[1],
        source: 'meta',
      }
    }
  }

  return {
    token: null,
    source: null,
  }
}

function buildLoginRequest(params: {
  emailField: string
  passwordField: string
  username: string
  password: string
  csrfField: string
  csrfToken: string | null
  requestEncoding: 'form' | 'json'
}): {
  body: string
  contentType: string
} {
  const payload: Record<string, string> = {
    [params.emailField]: params.username,
    [params.passwordField]: params.password,
  }

  if (params.csrfToken) {
    payload[params.csrfField] = params.csrfToken
  }

  if (params.requestEncoding === 'json') {
    return {
      body: JSON.stringify(payload),
      contentType: 'application/json',
    }
  }

  const form = new URLSearchParams()

  for (const [key, value] of Object.entries(payload)) {
    form.set(key, value)
  }

  return {
    body: form.toString(),
    contentType: 'application/x-www-form-urlencoded',
  }
}

function isLikelySuccess(params: {
  status: number
  redirectedTo: string | null
  finalCookieCount: number
  bodyPreview: string | null
  successPath: string | null
  loginPath: string
}): boolean {
  const redirectedTo = params.redirectedTo?.toLowerCase() ?? ''
  const bodyPreview = params.bodyPreview?.toLowerCase() ?? ''
  const loginPath = params.loginPath.toLowerCase()
  const successPath = params.successPath?.toLowerCase() ?? null

  const successByRedirect =
    params.status >= 300 &&
    params.status < 400 &&
    Boolean(redirectedTo) &&
    !redirectedTo.includes(loginPath) &&
    (!successPath || redirectedTo.includes(successPath))

  const failureWords = [
    'bad request',
    'unauthenticated',
    'invalid',
    'login',
    'sign in',
    'sign-in',
  ]

  const looksLikeFailureBody = failureWords.some((word) =>
    bodyPreview.includes(word)
  )

  const successByCookies =
    params.finalCookieCount > 0 && params.status < 500 && !looksLikeFailureBody

  const successByStatusOnly =
    params.status >= 200 && params.status < 300 && !looksLikeFailureBody

  return successByRedirect || successByCookies || successByStatusOnly
}

export async function testMyServiceCloudConnectivity(): Promise<MyServiceCloudConnectivityResult> {
  try {
    const config = getMyServiceCloudConfig()
    const loginUrl = joinUrl(config.baseUrl, config.loginPath)

    const preflightResponse = await fetchWithTimeout(
      loginUrl,
      {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      },
      config.timeoutMs
    )

    const preflightParsed = await parseHttpResponseBody(preflightResponse)
    const preflightCookies = cookieJarFromSetCookieHeaders(
      getSetCookieValues(preflightResponse)
    )
    const csrf = extractCsrfToken({
      html: preflightParsed.text,
      csrfField: config.csrfField,
      csrfMetaName: config.csrfMetaName,
    })

    let loginStatus: number | null = null
    let bodyKind: 'json' | 'text' | 'empty' | null = preflightParsed.kind
    let bodyPreview: string | null = preflightParsed.text
    let json: unknown | null = preflightParsed.json
    let redirectedTo: string | null = null
    let finalCookieCount = preflightCookies.size

    let ok = preflightResponse.ok

    if (config.authMode === 'username_password') {
      if (!config.username || !config.password) {
        throw new Error(
          'My Service Cloud username/password auth requires username and password.'
        )
      }

      const loginRequest = buildLoginRequest({
        emailField: config.emailField,
        passwordField: config.passwordField,
        username: config.username,
        password: config.password,
        csrfField: config.csrfField,
        csrfToken: csrf.token,
        requestEncoding: config.requestEncoding,
      })

      const cookieHeader = cookieJarToHeader(preflightCookies)
      const headers: Record<string, string> = {
        Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
        'Content-Type': loginRequest.contentType,
        Origin: config.baseUrl.replace(/\/+$/, ''),
        Referer: loginUrl,
      }

      if (cookieHeader) {
        headers.Cookie = cookieHeader
      }

      if (csrf.token && config.useCsrfHeader) {
        headers['X-CSRF-TOKEN'] = csrf.token
      }

      if (config.tenantId) {
        headers['X-Tenant-Id'] = config.tenantId
      }

      const loginResponse = await fetchWithTimeout(
        loginUrl,
        {
          method: config.loginMethod,
          headers,
          body: loginRequest.body,
          redirect: 'manual',
        },
        config.timeoutMs
      )

      const loginParsed = await parseHttpResponseBody(loginResponse)
      const loginCookies = cookieJarFromSetCookieHeaders(
        getSetCookieValues(loginResponse)
      )
      const mergedCookies = mergeCookieJars(
        preflightCookies,
        loginCookies
      )

      loginStatus = loginResponse.status
      bodyKind = loginParsed.kind
      bodyPreview = loginParsed.text
      json = loginParsed.json
      redirectedTo = loginResponse.headers.get('location')
      finalCookieCount = mergedCookies.size

      ok = isLikelySuccess({
        status: loginResponse.status,
        redirectedTo,
        finalCookieCount,
        bodyPreview,
        successPath: config.successPath,
        loginPath: config.loginPath,
      })
    }

    return {
      configured: true,
      reachable: true,
      ok,
      preflightStatus: preflightResponse.status,
      loginStatus,
      loginUrl,
      authMode: config.authMode,
      requestMethod: config.authMode === 'username_password' ? config.loginMethod : null,
      requestEncoding:
        config.authMode === 'username_password'
          ? config.requestEncoding
          : null,
      extractedCsrfToken: Boolean(csrf.token),
      csrfSource: csrf.source,
      bodyKind,
      bodyPreview,
      json,
      redirectedTo,
      initialCookieCount: preflightCookies.size,
      finalCookieCount,
      error: null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    const isConfigError =
      message.includes('Missing MY_SERVICE_CLOUD_') ||
      message.includes('My Service Cloud auth is not configured')

    return {
      configured: !isConfigError,
      reachable: false,
      ok: false,
      preflightStatus: null,
      loginStatus: null,
      loginUrl: null,
      authMode: null,
      requestMethod: null,
      requestEncoding: null,
      extractedCsrfToken: false,
      csrfSource: null,
      bodyKind: null,
      bodyPreview: null,
      json: null,
      redirectedTo: null,
      initialCookieCount: 0,
      finalCookieCount: 0,
      error: message,
    }
  }
}