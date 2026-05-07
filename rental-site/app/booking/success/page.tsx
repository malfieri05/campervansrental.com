import { redirect } from 'next/navigation'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BookingSuccessClient, { type TripSummary } from '@/components/booking/BookingSuccessClient'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800'

type ListingEmbed = {
  title: string
  slug: string
  category: string
  location_label: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  vin: string | null
  license_plate: string | null
  listing_images: { url: string; sort_order: number }[] | null
}

type HostEmbed = {
  display_name: string | null
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; openAgreement?: string }
}) {
  const sessionId = searchParams.session_id
  if (!sessionId) redirect('/booking')

  const openAgreementParam = searchParams.openAgreement
  const initialWorkspaceOpen =
    openAgreementParam === '1' ||
    openAgreementParam === 'true' ||
    openAgreementParam === 'yes'

  const stripe = getStripe()
  let paid = false
  let tripSummary: TripSummary | null = null
  let reservationId: string | null = null
  let reservationStatus: string | null = null
  let vehicleYear  = ''
  let vehicleMake  = ''
  let vehicleModel = ''
  let vin: string | undefined
  let licensePlate: string | undefined
  let hostName = 'the Host'

  try {
    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      paid = session.payment_status === 'paid'
      reservationId = session.metadata?.reservation_id ?? null

      const svc = createServiceRoleClient()
      if (svc && reservationId) {
        const { data: resv } = await svc
          .from('reservations')
          .select(
            `
            start_date,
            end_date,
            guests,
            total_cents,
            deposit_cents,
            status,
            listings (
              title,
              slug,
              category,
              location_label,
              vehicle_year,
              vehicle_make,
              vehicle_model,
              vin,
              license_plate,
              listing_images (url, sort_order),
              profiles:owner_id (
                display_name
              )
            )
          `
          )
          .eq('id', reservationId)
          .maybeSingle()

        const rawListing = resv?.listings as
          | (ListingEmbed & { profiles?: HostEmbed | HostEmbed[] | null })
          | (ListingEmbed & { profiles?: HostEmbed | HostEmbed[] | null })[]
          | null
          | undefined
        const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing

        if (resv && listing) {
          reservationStatus = (resv.status as string | null) ?? null
          const rawHost = listing.profiles
          const host = Array.isArray(rawHost) ? rawHost[0] : rawHost
          if (host?.display_name) hostName = host.display_name

          vehicleYear  = listing.vehicle_year  != null ? String(listing.vehicle_year)  : ''
          vehicleMake  = listing.vehicle_make  ?? ''
          vehicleModel = listing.vehicle_model ?? ''
          vin          = listing.vin ?? undefined
          licensePlate = listing.license_plate ?? undefined

          const imgs =
            listing.listing_images && listing.listing_images.length > 0
              ? [...listing.listing_images]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((i) => i.url)
              : [PLACEHOLDER_IMG]

          const start  = resv.start_date as string
          const end    = resv.end_date   as string
          const nights = Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)))

          tripSummary = {
            primaryImage:        imgs[0],
            title:               listing.title,
            slug:                listing.slug,
            category:            listing.category,
            location:            listing.location_label?.trim() || 'See listing',
            startDate:           start,
            endDate:             end,
            guests:              resv.guests        as number,
            nights,
            tripTotalCents:      resv.total_cents   as number,
            reservationFeeCents: resv.deposit_cents as number,
          }
        }
      }
    }
  } catch {
    paid = false
  }

  return (
    <BookingSuccessClient
      paid={paid}
      tripSummary={tripSummary}
      stripeSessionId={sessionId}
      reservationId={reservationId}
      reservationStatus={reservationStatus}
      hostName={hostName}
      vehicleYear={vehicleYear}
      vehicleMake={vehicleMake}
      vehicleModel={vehicleModel}
      vin={vin}
      licensePlate={licensePlate}
      initialWorkspaceOpen={initialWorkspaceOpen}
    />
  )
}
