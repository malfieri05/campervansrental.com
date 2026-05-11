import { redirect } from 'next/navigation'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import TripsPageClient, { type TripItem } from '@/components/trips/TripsPageClient'
import { isReviewEligible } from '@/lib/listing-reviews'

export const dynamic = 'force-dynamic'

type ListingEmbed = {
  title: string
  slug: string
  category: string
  location_label: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  listing_images: { url: string; sort_order: number }[] | null
}

type ReservationRow = {
  id: string
  start_date: string
  end_date: string
  guests: number
  status: string
  subtotal_cents: number
  fees_cents: number
  total_cents: number
  deposit_cents: number
  pickup_location: string | null
  stripe_checkout_session_id: string | null
  listings: ListingEmbed | ListingEmbed[] | null
}

type AgreementRow = {
  reservation_id: string
  completed_at: string | null
}

type ReviewRow = {
  reservation_id: string
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function toTripItem(row: ReservationRow, signedIds: Set<string>, reviewedIds: Set<string>): TripItem {
  const listing = one(row.listings)
  const start = row.start_date
  const end = row.end_date
  const nights = Math.max(
    1,
    differenceInCalendarDays(parseISO(end), parseISO(start))
  )

  const sortedImages = listing?.listing_images?.length
    ? [...listing.listing_images].sort((a, b) => a.sort_order - b.sort_order)
    : null

  return {
    id: row.id,
    start_date: start,
    end_date: end,
    guests: row.guests,
    status: row.status,
    nights,
    subtotal_cents: row.subtotal_cents,
    fees_cents: row.fees_cents,
    total_cents: row.total_cents,
    deposit_cents: row.deposit_cents,
    pickup_location: row.pickup_location,
    listing_title: listing?.title ?? 'Campervan',
    listing_slug: listing?.slug ?? '',
    listing_category: listing?.category ?? 'classic',
    listing_location: listing?.location_label ?? null,
    listing_image: sortedImages?.[0]?.url ?? null,
    listing_vehicle_year: listing?.vehicle_year != null ? String(listing.vehicle_year) : null,
    listing_vehicle_make: listing?.vehicle_make ?? null,
    listing_vehicle_model: listing?.vehicle_model ?? null,
    has_signed_agreement: signedIds.has(row.id),
    stripe_checkout_session_id: row.stripe_checkout_session_id ?? null,
    has_review: reviewedIds.has(row.id),
    review_eligible: isReviewEligible(end, row.status, reviewedIds.has(row.id)),
  }
}

export default async function TripsPage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/account')

  const today = new Date().toISOString().split('T')[0]

  // Fetch all non-cancelled confirmed/pending trips
  const { data: allRows } = await supabase
    .from('reservations')
    .select(
      `
      id,
      start_date,
      end_date,
      guests,
      status,
      subtotal_cents,
      fees_cents,
      total_cents,
      deposit_cents,
      pickup_location,
      stripe_checkout_session_id,
      listings (
        title,
        slug,
        category,
        location_label,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        listing_images ( url, sort_order )
      )
    `
    )
    .eq('renter_id', user.id)
    .neq('status', 'cancelled')
    .order('start_date', { ascending: false })

  // Fetch cancelled trips (Previous tab only)
  const { data: cancelledRows } = await supabase
    .from('reservations')
    .select(
      `
      id,
      start_date,
      end_date,
      guests,
      status,
      subtotal_cents,
      fees_cents,
      total_cents,
      deposit_cents,
      pickup_location,
      stripe_checkout_session_id,
      listings (
        title,
        slug,
        category,
        location_label,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        listing_images ( url, sort_order )
      )
    `
    )
    .eq('renter_id', user.id)
    .eq('status', 'cancelled')
    .order('start_date', { ascending: false })

  const activeRows = (allRows ?? []) as unknown as ReservationRow[]
  const cancelled = (cancelledRows ?? []) as unknown as ReservationRow[]

  // Fetch signed agreements and existing reviews for this user's reservations
  const allIds = [...activeRows, ...cancelled].map((r) => r.id)
  let signedIds = new Set<string>()
  let reviewedIds = new Set<string>()
  if (allIds.length > 0) {
    const [agreementsRes, reviewsRes] = await Promise.all([
      supabase
        .from('rental_agreement_submissions')
        .select('reservation_id, completed_at')
        .in('reservation_id', allIds)
        .not('completed_at', 'is', null),
      supabase
        .from('listing_reviews')
        .select('reservation_id')
        .in('reservation_id', allIds),
    ])
    ;(agreementsRes.data ?? []).forEach((a: AgreementRow) => signedIds.add(a.reservation_id))
    ;(reviewsRes.data ?? []).forEach((r: ReviewRow) => reviewedIds.add(r.reservation_id))
  }

  // Split into Upcoming and Previous
  const upcoming: TripItem[] = activeRows
    .filter((r) => r.end_date >= today && r.status !== 'cancelled')
    .map((r) => toTripItem(r, signedIds, reviewedIds))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const previousActive: TripItem[] = activeRows
    .filter((r) => r.end_date < today && r.status !== 'cancelled')
    .map((r) => toTripItem(r, signedIds, reviewedIds))

  const previousCancelled: TripItem[] = cancelled.map((r) => toTripItem(r, signedIds, reviewedIds))

  const previous: TripItem[] = [...previousActive, ...previousCancelled].sort(
    (a, b) => b.start_date.localeCompare(a.start_date)
  )

  return (
    <TripsPageClient upcoming={upcoming} previous={previous} />
  )
}
