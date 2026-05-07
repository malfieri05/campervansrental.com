import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { makeCalendarExportToken } from '@/lib/host-calendar-export-url'

/**
 * GET /api/host/calendar/export/[listingId]?token=<hmac>
 *
 * Returns an ICS file containing all busy blocks for the listing:
 * confirmed_reservation + host_blocked + external_sync (deduped).
 *
 * The URL is protected by an HMAC-SHA256 token so the endpoint cannot
 * be enumerated. Token = HMAC(CALENDAR_EXPORT_SECRET, listingId).
 * Hosts retrieve the pre-signed URL from the CalendarSyncModal.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params
  const token = req.nextUrl.searchParams.get('token') ?? ''

  // Verify HMAC token
  let expectedToken: string
  try {
    expectedToken = makeCalendarExportToken(listingId)
  } catch {
    return new NextResponse('CALENDAR_EXPORT_SECRET not configured', { status: 503 })
  }

  if (token !== expectedToken) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return new NextResponse('Service role not configured', { status: 503 })

  const { data: blocks, error } = await serviceRole
    .from('availability_blocks')
    .select('start_date, end_date, block_type')
    .eq('listing_id', listingId)
    .order('start_date', { ascending: true })

  if (error) return new NextResponse(error.message, { status: 500 })

  const { data: listing } = await serviceRole
    .from('listings')
    .select('title, slug')
    .eq('id', listingId)
    .maybeSingle()

  const listingTitle = (listing?.title as string) ?? 'Campervan Rental'

  const now = new Date()
  const stamp = formatDt(now)

  const events = (blocks ?? []).map((b, i) => {
    const uid = `${listingId}-block-${i}@campervansrental.com`
    const label = b.block_type === 'confirmed_reservation' ? 'Reservation' : 'Unavailable'
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${(b.start_date as string).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${(b.end_date as string).replace(/-/g, '')}`,
      `SUMMARY:${listingTitle} – ${label}`,
      'END:VEVENT',
    ].join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampervansRental//Host Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${listingTitle} Availability`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${listingId}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}

function formatDt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}
