import { isSupabaseExplicitlyOffline, isSupabaseConfigured } from '@/lib/env'
import {
  getSupabaseEnvSyncIssues,
  hasSupabaseEnvTouched,
  isSupabaseEnvStructurallyValid,
} from '@/lib/supabase-env-validation'
import { probeSupabaseReachable } from '@/lib/supabase-env-probe'

export async function DevSupabaseConfigBanner() {
  if (process.env.NODE_ENV !== 'development') return null

  if (isSupabaseExplicitlyOffline()) return null

  const syncIssues = getSupabaseEnvSyncIssues()
  const touched = hasSupabaseEnvTouched()

  let reachabilityMessage: string | null = null
  if (isSupabaseEnvStructurallyValid() && isSupabaseConfigured()) {
    const probe = await probeSupabaseReachable()
    if (!probe.ok) reachabilityMessage = probe.message
  }

  const showBanner =
    (touched && syncIssues.length > 0) || reachabilityMessage !== null
  if (!showBanner) return null

  return (
    <div
      className="relative z-[1100] border-b border-gold-600 bg-gold-200 px-4 py-3 text-sm text-forest-950 shadow-sm"
      role="status"
    >
      <p className="font-display font-semibold tracking-tight">
        Supabase configuration (development)
      </p>
      {syncIssues.length > 0 ? (
        <ul className="mt-2 list-inside list-disc font-sans text-forest-900">
          {syncIssues.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {reachabilityMessage ? (
        <p className="mt-2 font-sans text-forest-900">
          <span className="font-medium">Reachability:</span> {reachabilityMessage}{' '}
          Update <code className="rounded bg-gold-100 px-1">.env</code> with a
          live project URL and keys from the Supabase dashboard (Settings →
          API).
        </p>
      ) : null}
    </div>
  )
}
