import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isStripeWebhookConfigured } from '@/lib/env'
import { sendBookingConfirmationEmail } from '@/lib/email'

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret || !isStripeWebhookConfigured()) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const hdrs = await headers()
  const sig = hdrs.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as { metadata?: Record<string, string> }
    const reservationId = session.metadata?.reservation_id
    if (reservationId) {
      const svc = createServiceRoleClient()
      if (svc) {
        await svc
          .from('reservations')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', reservationId)
          .eq('status', 'pending_payment')
      }
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata?: Record<string, string> }
    const reservationId = session.metadata?.reservation_id
    if (!reservationId) {
      return NextResponse.json({ received: true })
    }

    const svc = createServiceRoleClient()
    if (!svc) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    type ListingRow = {
      title: string
      slug: string
      category: string
      location_label: string | null
    }

    const { data: resv } = await svc
      .from('reservations')
      .select(
        `
        id,
        status,
        listing_id,
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

    if (!resv || resv.status !== 'pending_payment') {
      return NextResponse.json({ received: true })
    }

    const rawListing = resv.listings as ListingRow | ListingRow[] | null | undefined
    const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing

    await svc
      .from('reservations')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', reservationId)

    await svc.from('availability_blocks').insert({
      listing_id: resv.listing_id,
      start_date: resv.start_date,
      end_date: resv.end_date,
      block_type: 'confirmed_reservation',
      reservation_id: reservationId,
    })

    const guestEmail = (resv.guest_email as string | null)?.trim()
    if (guestEmail && listing) {
      const start = resv.start_date as string
      const end = resv.end_date as string
      const nights = Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)))
      const pickup =
        typeof resv.pickup_location === 'string' && resv.pickup_location.trim()
          ? resv.pickup_location.trim()
          : listing.location_label?.trim() || 'See listing'

      try {
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
      } catch (e) {
        console.error('[stripe webhook] booking confirmation email failed:', e)
      }
    } else if (!guestEmail) {
      console.warn('[stripe webhook] no guest_email on reservation; skipping confirmation email', reservationId)
    } else if (!listing) {
      console.warn('[stripe webhook] listing missing for reservation; skipping confirmation email', reservationId)
    }
  }

  return NextResponse.json({ received: true })
}
