/**
 * Safe HTTP fetch wrapper for user-supplied URLs.
 * Enforces an allowlist of trusted hostnames, blocks SSRF targets,
 * caps the response body, and applies a hard timeout.
 */

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
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CampervansRental-Importer/1.0; +https://campervansrental.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
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
    throw new Error(`The listing page returned HTTP ${response.status}`)
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
