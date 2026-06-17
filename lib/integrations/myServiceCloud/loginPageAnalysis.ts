import { getMyServiceCloudConfig } from './config'
import {
  fetchWithTimeout,
  joinUrl,
  parseHttpResponseBody,
} from '../shared/http'

export type MyServiceCloudInputAnalysis = {
  tag: 'input' | 'textarea' | 'select'
  name: string | null
  id: string | null
  type: string | null
  placeholder: string | null
  autocomplete: string | null
  required: boolean
  valuePreview: string | null
}

export type MyServiceCloudButtonAnalysis = {
  tag: 'button' | 'input'
  type: string | null
  text: string | null
  id: string | null
  name: string | null
  valuePreview: string | null
}

export type MyServiceCloudScriptAnalysis = {
  src: string | null
  type: string | null
  preview: string | null
  fetchCalls: string[]
  axiosCalls: string[]
  formActionCandidates: string[]
  endpointCandidates: string[]
}

export type MyServiceCloudLoginPageAnalysisResult = {
  configured: boolean
  reachable: boolean
  status: number | null
  url: string | null
  bodyKind: 'json' | 'text' | 'empty' | null
  bodyPreview: string | null
  title: string | null
  setCookieCount: number
  inputCount: number
  inputs: MyServiceCloudInputAnalysis[]
  buttonCount: number
  buttons: MyServiceCloudButtonAnalysis[]
  scriptCount: number
  scripts: MyServiceCloudScriptAnalysis[]
  hasPasswordField: boolean
  hasEmailLikeField: boolean
  formActionCandidates: string[]
  endpointCandidates: string[]
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

function truncateValue(value: string | null, maxLength = 200): string | null {
  if (!value) {
    return null
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function extractAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*["']([^"']*)["']`,
    'i'
  )

  const match = tag.match(pattern)

  return match?.[1]?.trim() || null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i)
  return match?.[1] ? normalizeWhitespace(match[1]) : null
}

function parseInputs(html: string): MyServiceCloudInputAnalysis[] {
  const results: MyServiceCloudInputAnalysis[] = []

  const inputTags = html.match(/<input\b[^>]*>/gi) ?? []
  for (const tag of inputTags) {
    results.push({
      tag: 'input',
      name: extractAttribute(tag, 'name'),
      id: extractAttribute(tag, 'id'),
      type: extractAttribute(tag, 'type') || 'text',
      placeholder: extractAttribute(tag, 'placeholder'),
      autocomplete: extractAttribute(tag, 'autocomplete'),
      required: /\brequired\b/i.test(tag),
      valuePreview: truncateValue(extractAttribute(tag, 'value'), 80),
    })
  }

  const textareaTags = html.match(/<textarea\b[^>]*>/gi) ?? []
  for (const tag of textareaTags) {
    results.push({
      tag: 'textarea',
      name: extractAttribute(tag, 'name'),
      id: extractAttribute(tag, 'id'),
      type: null,
      placeholder: extractAttribute(tag, 'placeholder'),
      autocomplete: extractAttribute(tag, 'autocomplete'),
      required: /\brequired\b/i.test(tag),
      valuePreview: null,
    })
  }

  const selectTags = html.match(/<select\b[^>]*>/gi) ?? []
  for (const tag of selectTags) {
    results.push({
      tag: 'select',
      name: extractAttribute(tag, 'name'),
      id: extractAttribute(tag, 'id'),
      type: null,
      placeholder: null,
      autocomplete: null,
      required: /\brequired\b/i.test(tag),
      valuePreview: null,
    })
  }

  return results
}

function parseButtons(html: string): MyServiceCloudButtonAnalysis[] {
  const results: MyServiceCloudButtonAnalysis[] = []

  const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi
  let buttonMatch = buttonRegex.exec(html)

  while (buttonMatch) {
    const attributes = buttonMatch[1] ?? ''
    const innerHtml = buttonMatch[2] ?? ''
    const text = normalizeWhitespace(
      innerHtml.replace(/<[^>]+>/g, ' ').trim()
    )

    results.push({
      tag: 'button',
      type: extractAttribute(attributes, 'type') || 'submit',
      text: text || null,
      id: extractAttribute(attributes, 'id'),
      name: extractAttribute(attributes, 'name'),
      valuePreview: truncateValue(extractAttribute(attributes, 'value'), 80),
    })

    buttonMatch = buttonRegex.exec(html)
  }

  const inputButtonTags = html.match(/<input\b[^>]*type=["'](?:submit|button)["'][^>]*>/gi) ?? []
  for (const tag of inputButtonTags) {
    results.push({
      tag: 'input',
      type: extractAttribute(tag, 'type'),
      text: null,
      id: extractAttribute(tag, 'id'),
      name: extractAttribute(tag, 'name'),
      valuePreview: truncateValue(extractAttribute(tag, 'value'), 80),
    })
  }

  return results
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  )
}

function extractMatches(source: string, regex: RegExp): string[] {
  const matches: string[] = []
  let match = regex.exec(source)

  while (match) {
    if (match[1]) {
      matches.push(match[1])
    }

    match = regex.exec(source)
  }

  return uniqueStrings(matches)
}

function extractEndpointCandidates(source: string): string[] {
  return uniqueStrings([
    ...extractMatches(source, /fetch\(\s*["']([^"']+)["']/gi),
    ...extractMatches(source, /axios\.(?:post|get|put|patch|delete)\(\s*["']([^"']+)["']/gi),
    ...extractMatches(source, /url\s*:\s*["']([^"']+)["']/gi),
    ...extractMatches(source, /action\s*:\s*["']([^"']+)["']/gi),
    ...extractMatches(source, /["'](\/[^"']*(?:login|sign-in|signin|auth|session)[^"']*)["']/gi),
  ])
}

function parseScripts(html: string): MyServiceCloudScriptAnalysis[] {
  const results: MyServiceCloudScriptAnalysis[] = []
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let match = scriptRegex.exec(html)

  while (match) {
    const attributes = match[1] ?? ''
    const body = match[2] ?? ''
    const normalizedBody = normalizeWhitespace(body)
    const endpointCandidates = extractEndpointCandidates(body)

    results.push({
      src: extractAttribute(attributes, 'src'),
      type: extractAttribute(attributes, 'type'),
      preview: truncateValue(normalizedBody || null, 500),
      fetchCalls: extractMatches(body, /fetch\(\s*["']([^"']+)["']/gi),
      axiosCalls: extractMatches(
        body,
        /axios\.(?:post|get|put|patch|delete)\(\s*["']([^"']+)["']/gi
      ),
      formActionCandidates: extractMatches(
        body,
        /action\s*:\s*["']([^"']+)["']/gi
      ),
      endpointCandidates,
    })

    match = scriptRegex.exec(html)
  }

  return results
}

export async function getMyServiceCloudLoginPageAnalysis(): Promise<MyServiceCloudLoginPageAnalysisResult> {
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
    const inputs = parseInputs(html)
    const buttons = parseButtons(html)
    const scripts = parseScripts(html)
    const formActionCandidates = uniqueStrings(
      scripts.flatMap((script) => script.formActionCandidates)
    )
    const endpointCandidates = uniqueStrings(
      scripts.flatMap((script) => script.endpointCandidates)
    )

    const hasPasswordField = inputs.some((input) => {
      const type = input.type?.toLowerCase() ?? ''
      const name = input.name?.toLowerCase() ?? ''
      const id = input.id?.toLowerCase() ?? ''

      return type === 'password' || name.includes('password') || id.includes('password')
    })

    const hasEmailLikeField = inputs.some((input) => {
      const type = input.type?.toLowerCase() ?? ''
      const name = input.name?.toLowerCase() ?? ''
      const id = input.id?.toLowerCase() ?? ''
      const placeholder = input.placeholder?.toLowerCase() ?? ''

      return (
        type === 'email' ||
        name.includes('email') ||
        id.includes('email') ||
        placeholder.includes('email')
      )
    })

    return {
      configured: true,
      reachable: true,
      status: response.status,
      url,
      bodyKind: parsed.kind,
      bodyPreview: truncateValue(normalizeWhitespace(html), 2500),
      title: extractTitle(html),
      setCookieCount: getSetCookieValues(response).length,
      inputCount: inputs.length,
      inputs,
      buttonCount: buttons.length,
      buttons,
      scriptCount: scripts.length,
      scripts,
      hasPasswordField,
      hasEmailLikeField,
      formActionCandidates,
      endpointCandidates,
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
      title: null,
      setCookieCount: 0,
      inputCount: 0,
      inputs: [],
      buttonCount: 0,
      buttons: [],
      scriptCount: 0,
      scripts: [],
      hasPasswordField: false,
      hasEmailLikeField: false,
      formActionCandidates: [],
      endpointCandidates: [],
      error: message,
    }
  }
}