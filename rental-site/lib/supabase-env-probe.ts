type ProbeResult = { ok: true } | { ok: false; message: string }

/**
 * Dev-only reachability check. Avoid `cache()` from React here — it can confuse
 * Next.js RSC bundling and surface __webpack_modules__[moduleId] is not a function.
 */
export async function probeSupabaseReachable(): Promise<ProbeResult> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) return { ok: true }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (res.ok) return { ok: true }
    return {
      ok: false,
      message: `Supabase health check returned HTTP ${res.status}.`,
    }
  } catch (error) {
    clearTimeout(timeout)
    const name = error instanceof Error ? error.name : ''
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (name === 'AbortError') {
      return { ok: false, message: 'Supabase health check timed out (4s).' }
    }
    let causeText = ''
    if (error instanceof Error && error.cause instanceof Error) {
      causeText = error.cause.message
    }
    const detail =
      causeText && !message.includes(causeText) ? ` — ${causeText}` : ''
    return {
      ok: false,
      message: `Could not reach Supabase (${message}${detail}). Copy Project URL from Supabase → Settings → API into NEXT_PUBLIC_SUPABASE_URL (unpause alone does not fix a wrong hostname).`,
    }
  }
}
