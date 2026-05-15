import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/cron/sync-external-calendars
 *
 * Iterates all external calendar feeds that haven't been synced in the last
 * 6 hours and triggers a sync for each by calling the per-feed sync route.
 *
 * Secured by CRON_SECRET — Vercel Cron passes this automatically when the
 * route is listed in vercel.json's "crons" array with CRON_SECRET set.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? ''

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRole = createServiceRoleClient()
  if (!serviceRole) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 503 })
  }

  // Feeds not synced in past 6 hours
  const staleAfter = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

  const { data: feeds, error } = await serviceRole
    .from('listing_external_calendars')
    .select('id')
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleAfter}`)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`

  // Fan out syncs in parallel batches of 6 — polite to upstream iCal hosts
  // while cutting wall time from O(N) sequential to O(N/6) parallel.
  const CONCURRENCY = 6
  const allFeeds = feeds ?? []
  const results: { id: string; ok: boolean; error?: string }[] = []

  for (let i = 0; i < allFeeds.length; i += CONCURRENCY) {
    const batch = allFeeds.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(async (feed) => {
        const res = await fetch(
          `${baseUrl}/api/host/calendar/external/${feed.id}/sync`,
          { method: 'POST', headers: { Authorization: `Bearer ${cronSecret}` } }
        )
        const json = await res.json().catch(() => ({}))
        return { id: feed.id as string, ok: res.ok, error: (json as { error?: string }).error }
      })
    )
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value)
      } else {
        results.push({ id: 'unknown', ok: false, error: String(outcome.reason) })
      }
    }
  }

  return NextResponse.json({ synced: results.length, results })
}
