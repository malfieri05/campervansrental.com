/**
 * Safe HTTP fetch wrapper for user-supplied URLs.
 * Enforces an allowlist of trusted hostnames, blocks SSRF targets,
 * caps the response body, and applies a hard timeout.
 */

import { IMPORT_BROWSER_USER_AGENT } from './user-agent'

const ALLOWED_HOSTNAMES = new Set([
  'outdoorsy.com',
  'www.outdoorsy.com',
  'rvezy.com',
  'www.rvezy.com',
])

/** Block private / loopback / link-local IP ranges and cloud metadata endpoints. */
function isSsrfHost(hostname: string): boolean {
  const ssrfPatterns = [
    /^localhost$/i,
    /^127\./,
    /^0\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,                 // link-local / AWS metadata
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /metadata\.google\.internal/i,
  ]
  return ssrfPatterns.some((re) => re.test(hostname))
}

function getRootDomain(hostname: string): string {
  const parts = hostname.replace(/^www\./, '').split('.')
  return parts.slice(-2).join('.')
}

function validateUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed')
  }

  if (isSsrfHost(parsed.hostname)) {
    throw new Error('URL hostname is not allowed')
  }

  const rootDomain = getRootDomain(parsed.hostname)
  const allowedRoots = new Set(
    Array.from(ALLOWED_HOSTNAMES).map((h) => getRootDomain(h))
  )
  if (!allowedRoots.has(rootDomain)) {
    throw new Error(
      `Only Outdoorsy and RVezy listing URLs are supported in this version. Got: ${parsed.hostname}`
    )
  }

  return parsed
}

const FETCH_TIMEOUT_MS = 12_000
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2 MB

/** Mimics clicking from the site's homepage (same-origin navigation). */
function listingFetchHeadersSameOrigin(listUrl: URL): HeadersInit {
  const origin = `${listUrl.protocol}//${listUrl.hostname}`
  return {
    'User-Agent': IMPORT_BROWSER_USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: `${origin}/`,
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    DNT: '1',
  }
}

/** Alternate fingerprint: typed URL / external referrer (some WAFs expect this). */
function listingFetchHeadersCrossSite(listUrl: URL): HeadersInit {
  const origin = `${listUrl.protocol}//${listUrl.hostname}`
  return {
    'User-Agent': IMPORT_BROWSER_USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    // Hint we followed a search result to this listing domain
    ...(origin.includes('outdoorsy')
      ? ({ 'Sec-CH-UA-Mobile': '?0', 'Sec-CH-UA-Platform': '"macOS"' } as HeadersInit)
      : {}),
  }
}

function httpErrorMessage(status: number): string {
  if (status === 403 || status === 401) {
    return (
      `The marketplace blocked this request (HTTP ${status}). Their site often rejects automated fetches from servers. ` +
      `Try again from another network, import an RVezy URL instead, or copy your listing details manually into each section.`
    )
  }
  if (status === 429) {
    return 'Too many requests (HTTP 429). Wait a few minutes and try again.'
  }
  return `The listing page returned HTTP ${status}`
}

/**
 * Fetch HTML from an external listing URL with safety guards applied.
 * Returns the HTML string, or throws with a user-readable message.
 */
export async function fetchListingHtml(rawUrl: string): Promise<string> {
  const url = validateUrl(rawUrl)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: listingFetchHeadersSameOrigin(url),
    })

    // One retry with a different Sec-Fetch-* fingerprint — reduces false 403s from bot checks
    if (!response.ok && response.status === 403) {
      response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: listingFetchHeadersCrossSite(url),
      })
    }
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      throw new Error('Request timed out fetching the listing page')
    }
    throw new Error(`Network error: ${msg}`)
  }
  clearTimeout(timer)

  // Re-validate after any redirects
  const finalUrl = response.url
  try {
    validateUrl(finalUrl)
  } catch {
    throw new Error('Redirected to a disallowed URL')
  }

  if (!response.ok) {
    throw new Error(httpErrorMessage(response.status))
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('The URL did not return an HTML page')
  }

  const reader = response.body?.getReader()
  if (!reader) return await response.text()

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_BODY_BYTES) {
      reader.cancel()
      break
    }
    chunks.push(value)
  }

  const combined = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(combined)
}
