export type ParsedHttpBody = {
  kind: 'json' | 'text' | 'empty'
  json: unknown | null
  text: string | null
}

export function normalizeString(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBase}${normalizedPath}`
}

export function buildBasicAuthHeader(
  username: string,
  password: string
): string {
  return Buffer.from(`${username}:${password}`).toString('base64')
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function trimPreview(text: string, maxLength = 2000): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export async function parseHttpResponseBody(
  response: Response
): Promise<ParsedHttpBody> {
  const rawText = await response.text()
  const text = rawText.trim()

  if (!text) {
    return {
      kind: 'empty',
      json: null,
      text: null,
    }
  }

  try {
    return {
      kind: 'json',
      json: JSON.parse(text) as unknown,
      text: trimPreview(text),
    }
  } catch {
    return {
      kind: 'text',
      json: null,
      text: trimPreview(text),
    }
  }
}