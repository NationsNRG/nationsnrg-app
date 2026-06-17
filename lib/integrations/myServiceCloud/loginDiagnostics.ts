import { getMyServiceCloudConfig } from './config'
import {
  fetchWithTimeout,
  joinUrl,
  parseHttpResponseBody,
} from '../shared/http'

export type MyServiceCloudLoginField = {
  name: string | null
  type: string | null
  valuePreview: string | null
  required: boolean
}

export type MyServiceCloudLoginForm = {
  index: number
  action: string | null
  method: string
  inputCount: number
  fields: MyServiceCloudLoginField[]
  hiddenFields: MyServiceCloudLoginField[]
  csrfFieldCandidates: string[]
}

export type MyServiceCloudLoginDiagnosticsResult = {
  configured: boolean
  reachable: boolean
  status: number | null
  url: string | null
  bodyKind: 'json' | 'text' | 'empty' | null
  bodyPreview: string | null
  formCount: number
  forms: MyServiceCloudLoginForm[]
  metaCsrfTokenDetected: boolean
  metaCsrfTokenPreview: string | null
  csrfInputDetected: boolean
  csrfInputCandidates: string[]
  setCookieCount: number
  error: string | null
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function extractAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*["']([^"']*)["']`,
    'i'
  )

  const match = tag.match(pattern)

  return match?.[1]?.trim() || null
}

function truncateValue(value: string | null, maxLength = 120): string | null {
  if (!value) {
    return null
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function parseFormFields(formHtml: string): MyServiceCloudLoginField[] {
  const fields: MyServiceCloudLoginField[] = []
  const inputMatches = formHtml.match(/<input\b[^>]*>/gi) ?? []

  for (const inputTag of inputMatches) {
    const name = extractAttribute(inputTag, 'name')
    const type = extractAttribute(inputTag, 'type') || 'text'
    const value = extractAttribute(inputTag, 'value')
    const required = /\brequired\b/i.test(inputTag)

    fields.push({
      name,
      type,
      valuePreview: truncateValue(value),
      required,
    })
  }

  return fields
}

function buildFormDiagnostics(html: string): MyServiceCloudLoginForm[] {
  const forms: MyServiceCloudLoginForm[] = []
  const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let match: RegExpExecArray | null = formRegex.exec(html)
  let index = 0

  while (match) {
    const formTagAttributes = match[1] ?? ''
    const formInnerHtml = match[2] ?? ''
    const action = extractAttribute(formTagAttributes, 'action')
    const method = (extractAttribute(formTagAttributes, 'method') || 'GET').toUpperCase()
    const fields = parseFormFields(formInnerHtml)
    const hiddenFields = fields.filter((field) => field.type?.toLowerCase() === 'hidden')
    const csrfFieldCandidates = fields
      .map((field) => field.name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => /csrf|token|_token/i.test(name))

    forms.push({
      index,
      action,
      method,
      inputCount: fields.length,
      fields,
      hiddenFields,
      csrfFieldCandidates,
    })

    index += 1
    match = formRegex.exec(html)
  }

  return forms
}

function extractMetaCsrfToken(html: string): string | null {
  const metaMatch = html.match(
    /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i
  )

  return metaMatch?.[1]?.trim() || null
}

export async function getMyServiceCloudLoginDiagnostics(): Promise<MyServiceCloudLoginDiagnosticsResult> {
  try {
    const config = getMyServiceCloudConfig()
    const url = joinUrl(config.baseUrl, config.loginPath)

    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      },
      config.timeoutMs
    )

    const parsed = await parseHttpResponseBody(response)
    const html = parsed.text ?? ''
    const forms = buildFormDiagnostics(html)
    const metaCsrfToken = extractMetaCsrfToken(html)
    const setCookieCount = getSetCookieValues(response).length
    const csrfInputCandidates = Array.from(
      new Set(forms.flatMap((form) => form.csrfFieldCandidates))
    )

    return {
      configured: true,
      reachable: true,
      status: response.status,
      url,
      bodyKind: parsed.kind,
      bodyPreview: truncateValue(normalizeWhitespace(html), 2500),
      formCount: forms.length,
      forms,
      metaCsrfTokenDetected: Boolean(metaCsrfToken),
      metaCsrfTokenPreview: truncateValue(metaCsrfToken, 40),
      csrfInputDetected: csrfInputCandidates.length > 0,
      csrfInputCandidates,
      setCookieCount,
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
      status: null,
      url: null,
      bodyKind: null,
      bodyPreview: null,
      formCount: 0,
      forms: [],
      metaCsrfTokenDetected: false,
      metaCsrfTokenPreview: null,
      csrfInputDetected: false,
      csrfInputCandidates: [],
      setCookieCount: 0,
      error: message,
    }
  }
}