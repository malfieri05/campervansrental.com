import type { SupabaseClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { sendBookingConfirmationEmail } from '@/lib/email'

type ListingRow = {
  title: string
  slug: string
  category: string
  location_label: string | null
}

/**
 * Loads reservation + listing by id and sends guest booking confirmation (when Resend is configured).
 */
export async function sendBookingConfirmationForReservationId(
  svc: SupabaseClient,
  reservationId: string
): Promise<void> {
  const { data: resv } = await svc
    .from('reservations')
    .select(
      `
      id,
      start_date,
      end_date,
      guests,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      pickup_location,
      subtotal_cents,
      fees_cents,
      total_cents,
      deposit_cents,
      listings ( title, slug, category, location_label )
    `
    )
    .eq('id', reservationId)
    .maybeSingle()

  if (!resv) return

  const rawListing = resv.listings as ListingRow | ListingRow[] | null | undefined
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing

  const guestEmail = (resv.guest_email as string | null)?.trim()
  if (!guestEmail || !listing) {
    if (!guestEmail) {
      console.warn('[booking-confirmation] no guest_email; skipping', reservationId)
    }
    return
  }

  const start = resv.start_date as string
  const end = resv.end_date as string
  const nights = Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)))
  const pickup =
    typeof resv.pickup_location === 'string' && resv.pickup_location.trim()
      ? resv.pickup_location.trim()
      : listing.location_label?.trim() || 'See listing'

  await sendBookingConfirmationEmail({
    to: guestEmail,
    guestFirstName: (resv.guest_first_name as string | null) ?? '',
    guestLastName: (resv.guest_last_name as string | null) ?? '',
    guestPhone: (resv.guest_phone as string | null) ?? '',
    reservationId: resv.id as string,
    listingTitle: listing.title,
    listingSlug: listing.slug,
    listingCategory: listing.category,
    pickupLocation: pickup,
    startDate: start,
    endDate: end,
    nights,
    guests: resv.guests as number,
    subtotalCents: resv.subtotal_cents as number,
    feesCents: resv.fees_cents as number,
    totalCents: resv.total_cents as number,
    reservationFeePaidCents: resv.deposit_cents as number,
  })
}
