/**
 * Stateless, cookie-free Supabase client for public (non-authenticated) reads.
 *
 * Use this — not createServerSupabaseClient — for data that:
 *   1. Is visible to all anonymous users (e.g. published listings, public images)
 *   2. Should be wrapped in `unstable_cache` / ISR
 *
 * Because there are no cookies involved, Next.js can safely cache responses
 * across requests without risking per-user data leaking.
 */
import { createClient } from '@supabase/supabase-js'

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
