import { createServerSupabaseClient } from '@/lib/supabase/server'
import HostCalendarClient from './HostCalendarClient'

export type HostListingMeta = {
  id: string
  title: string
  slug: string
  price_per_night_cents: number | null
  primary_image_url: string | null
}

export type CalendarReservation = {
  id: string
  start_date: string
  end_date: string
  status: string
  guest_first_name: string | null
  guest_last_name: string | null
}

export type ExternalFeed = {
  id: string
  display_name: string
  ical_url: string
  last_synced_at: string | null
  last_sync_error: string | null
}

export type BlockRow = {
  start_date: string
  end_date: string
  block_type: string
  /** Set when block_type === 'external_sync'; links row to listing_external_calendars */
  external_calendar_id: string | null
}

/** Host calendar ICS export URL from GET /api/host/calendar/export-url */
export type ExportUrlFetchStatus = 'loading' | 'ready' | 'unavailable'

export default async function HostCalendarPage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Listings with primary image + nightly rate
  const { data: rawListings } = await supabase
    .from('listings')
    .select(`
      id, title, slug, price_per_night_cents,
      listing_images ( url, sort_order )
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const listings: HostListingMeta[] = (rawListings ?? []).map((l) => {
    const images = (l.listing_images ?? []) as { url: string; sort_order: number }[]
    images.sort((a, b) => a.sort_order - b.sort_order)
    return {
      id: l.id as string,
      title: l.title as string,
      slug: l.slug as string,
      price_per_night_cents: (l.price_per_night_cents as number | null) ?? null,
      primary_image_url: images[0]?.url ?? null,
    }
  })

  const firstListing = listings[0] ?? null

  // Parallel: blocks + reservations + external feeds for first listing
  const [blocksRes, reservationsRes, feedsRes] = firstListing
    ? await Promise.all([
        supabase
          .from('availability_blocks')
          .select('start_date, end_date, block_type, external_calendar_id')
          .eq('listing_id', firstListing.id)
          .order('start_date', { ascending: true }),
        supabase
          .from('reservations')
          .select('id, start_date, end_date, status, guest_first_name, guest_last_name')
          .eq('listing_id', firstListing.id)
          .order('start_date', { ascending: true }),
        supabase
          .from('listing_external_calendars')
          .select('id, display_name, ical_url, last_synced_at, last_sync_error')
          .eq('listing_id', firstListing.id)
          .order('created_at', { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const initialBlocks = (blocksRes.data ?? []) as BlockRow[]
  const initialReservations = (reservationsRes.data ?? []) as CalendarReservation[]
  const initialFeeds = (feedsRes.data ?? []) as ExternalFeed[]

  return (
    <HostCalendarClient
      listings={listings}
      initialListingId={firstListing?.id ?? null}
      initialBlocks={initialBlocks}
      initialReservations={initialReservations}
      initialFeeds={initialFeeds}
    />
  )
}
