function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const segment = parts[1]
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function supabaseProjectRefFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase()
  const m = /^([a-z0-9-]{1,63})\.supabase\.co$/.exec(host)
  return m ? m[1] : null
}

function hasPublicSupabaseCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

/** True if either public Supabase env var is non-empty (partial setup). */
export function hasSupabaseEnvTouched(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

/**
 * Synchronous checks for obvious misconfiguration (wrong host shape, http, JWT mismatch).
 * Does not prove DNS/network reachability — use the dev probe for that.
 */
export function getSupabaseEnvSyncIssues(): string[] {
  const issues: string[] = []
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!urlRaw || !anonRaw) {
    if (!urlRaw) issues.push('NEXT_PUBLIC_SUPABASE_URL is missing or empty.')
    if (!anonRaw) issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty.')
    return issues
  }

  const url = urlRaw
  const anon = anonRaw

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return ['NEXT_PUBLIC_SUPABASE_URL is not a valid URL.']
  }

  if (parsed.protocol !== 'https:') {
    issues.push('NEXT_PUBLIC_SUPABASE_URL must use https.')
  }

  const host = parsed.hostname.toLowerCase()
  if (!/^[a-z0-9-]{1,63}\.supabase\.co$/.test(host)) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_URL host must be <project-ref>.supabase.co (hosted Supabase).'
    )
  }

  const projectRef = supabaseProjectRefFromHostname(host)
  const payload = decodeJwtPayload(anon)
  if (!payload) {
    issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid JWT.')
  } else if (
    typeof payload.ref === 'string' &&
    projectRef &&
    payload.ref !== projectRef
  ) {
    issues.push(
      `JWT "ref" (${payload.ref}) does not match the project ref in the URL (${projectRef}).`
    )
  }

  return issues
}

/** URL + anon key present and pass sync validation (does not check OFFLINE flag). */
export function isSupabaseEnvStructurallyValid(): boolean {
  return hasPublicSupabaseCredentials() && getSupabaseEnvSyncIssues().length === 0
}
