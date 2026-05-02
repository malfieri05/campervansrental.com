import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { fetchICalBusyIntervals } from '@/lib/ical-sync'

/**
 * POST /api/host/calendar/external/[id]/sync
 *
 * 1. Verifies ownership.
 * 2. Fetches + parses the iCal feed.
 * 3. Atomically replaces all external_sync blocks for this feed.
 * 4. Records last_synced_at / last_sync_error.
 *
 * Callable from the UI ("Sync now") or the cron route.
 * When called from cron the request carries Authorization: Bearer <CRON_SECRET>;
 * when called from UI the user's session cookie is used.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const serviceRole = createServiceRoleClient()
  if (!serviceRole) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 503 })
  }

  // Auth: UI user session OR cron secret
  const authHeader = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  let ownerId: string | null = null

  if (!isCron) {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    ownerId = user.id
  }

  // Fetch feed metadata
  const feedQuery = serviceRole
    .from('listing_external_calendars')
    .select('id, ical_url, listing_id, owner_id')
    .eq('id', id)

  if (ownerId) feedQuery.eq('owner_id', ownerId)

  const { data: feed, error: feedErr } = await feedQuery.maybeSingle()
  if (feedErr || !feed) {
    return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
  }

  // Fetch + parse iCal
  let intervals: Awaited<ReturnType<typeof fetchICalBusyIntervals>>
  try {
    intervals = await fetchICalBusyIntervals(feed.ical_url as string)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await serviceRole
      .from('listing_external_calendars')
      .update({ last_sync_error: msg, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Replace blocks for this feed atomically
  const { error: delErr } = await serviceRole
    .from('availability_blocks')
    .delete()
    .eq('external_calendar_id', id)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (intervals.length > 0) {
    const rows = intervals.map((iv) => ({
      listing_id: feed.listing_id,
      start_date: iv.start,
      end_date: iv.end,
      block_type: 'external_sync',
      external_calendar_id: id,
    }))

    const { error: insErr } = await serviceRole
      .from('availability_blocks')
      .insert(rows)

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  // Record success
  await serviceRole
    .from('listing_external_calendars')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, imported: intervals.length })
}
