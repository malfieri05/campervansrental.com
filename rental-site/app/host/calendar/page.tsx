import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getBlockedRangesForListing } from '@/lib/availability'
import HostCalendarClient from './HostCalendarClient'

type HostListing = {
  id: string
  title: string
  slug: string
}

export default async function HostCalendarPage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawListings } = await supabase
    .from('listings')
    .select('id, title, slug')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const listings = (rawListings ?? []) as HostListing[]

  // Pre-fetch blocks for the first listing (server-side for initial paint)
  const firstListing = listings[0] ?? null
  const initialBlocks = firstListing ? await getBlockedRangesForListing(firstListing.id) : []

  return (
    <HostCalendarClient
      listings={listings}
      initialListingId={firstListing?.id ?? null}
      initialBlocks={initialBlocks}
    />
  )
}
