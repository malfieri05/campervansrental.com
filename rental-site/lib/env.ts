import { getSupabaseEnvSyncIssues } from '@/lib/supabase-env-validation'

/**
 * Opt out of every Supabase network call (middleware, RSC, browser client).
 * Use for local marketing/static work when you do not have a live project yet.
 * Set to false (or remove) once NEXT_PUBLIC_SUPABASE_URL and keys point at a real project.
 */
export function isSupabaseExplicitlyOffline(): boolean {
  const v = process.env.NEXT_PUBLIC_SUPABASE_OFFLINE?.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

/**
 * Whether the app may open connections to Supabase.
 * False when offline, missing keys, or public env fails validation (bad URL, JWT ref mismatch, etc.).
 * This is the only check features should use before calling Supabase.
 */
export function isSupabaseConfigured(): boolean {
  if (isSupabaseExplicitlyOffline()) return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return false
  return getSupabaseEnvSyncIssues().length === 0
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/**
 * Show “Connect Stripe” for hosts on /account. Set NEXT_PUBLIC_STRIPE_HOST_CONNECT=false
 * when your platform Stripe account cannot use Connect yet (e.g. dashboard blocks it until Atlas).
 */
export function isStripeHostConnectOffered(): boolean {
  const v = process.env.NEXT_PUBLIC_STRIPE_HOST_CONNECT?.trim().toLowerCase()
  if (v === 'false' || v === '0' || v === 'no') return false
  return true
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
