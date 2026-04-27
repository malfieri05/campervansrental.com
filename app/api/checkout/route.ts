import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { siteUrl } from '@/lib/env'
import { dateRangesOverlapHalfOpen } from '@/lib/checkout'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    listingId: string
    startDate: string
    endDate: string
    guests: number
    pickupLocation: string
    guestFirstName: string
    guestLastName: string
    guestEmail: string
    guestPhone: string
    specialRequests?: string
  }

  const {
    listingId,
    startDate,
    endDate,
    guests,
    pickupLocation,
    guestFirstName,
    guestLastName,
    guestEmail,
    guestPhone,
    specialRequests,
  } = body

  if (
    !listingId ||
    !startDate ||
    !endDate ||
    !guests ||
    !pickupLocation ||
    !guestFirstName ||
    !guestLastName ||
    !guestEmail ||
    !guestPhone
  ) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  if (!svc) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const { data: listing, error: listingErr } = await svc
    .from('listings')
    .select(
      'id, title, price_per_night_cents, cleaning_fee_cents, insurance_fee_cents, min_nights, status'
    )
    .eq('id', listingId)
    .eq('status', 'published')
    .maybeSingle()

  if (listingErr || !listing) {
    return NextResponse.json({ error: 'Listing not available' }, { status: 404 })
  }

  const nights = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (nights < (listing.min_nights as number)) {
    return NextResponse.json(
      { error: `Minimum stay is ${listing.min_nights} nights` },
      { status: 400 }
    )
  }

  const { data: reservations } = await svc
    .from('reservations')
    .select('start_date, end_date, status')
    .eq('listing_id', listingId)
    .in('status', ['confirmed', 'pending_payment'])

  for (const r of reservations || []) {
    if (
      dateRangesOverlapHalfOpen(
        startDate,
        endDate,
        r.start_date as string,
        r.end_date as string
      )
    ) {
      return NextResponse.json({ error: 'Those dates are no longer available' }, { status: 409 })
    }
  }

  const { data: blocks } = await svc
    .from('availability_blocks')
    .select('start_date, end_date')
    .eq('listing_id', listingId)

  for (const b of blocks || []) {
    if (
      dateRangesOverlapHalfOpen(
        startDate,
        endDate,
        b.start_date as string,
        b.end_date as string
      )
    ) {
      return NextResponse.json({ error: 'Those dates are blocked' }, { status: 409 })
    }
  }

  const nightly = listing.price_per_night_cents as number
  const cleaning = listing.cleaning_fee_cents as number
  const insurance = listing.insurance_fee_cents as number
  const subtotal = nightly * nights
  const fees = cleaning + insurance
  const total = subtotal + fees

  const depositCents = Number(process.env.STRIPE_DEPOSIT_CENTS || '10000')

  const { data: reservation, error: resErr } = await supabase
    .from('reservations')
    .insert({
      listing_id: listingId,
      renter_id: user.id,
      start_date: startDate,
      end_date: endDate,
      guests,
      status: 'pending_payment',
      subtotal_cents: subtotal,
      fees_cents: fees,
      total_cents: total,
      deposit_cents: depositCents,
      pickup_location: pickupLocation,
      guest_first_name: guestFirstName,
      guest_last_name: guestLastName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      special_requests: specialRequests ?? null,
    })
    .select('id')
    .single()

  if (resErr || !reservation) {
    return NextResponse.json({ error: resErr?.message ?? 'Could not create reservation' }, { status: 500 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      {
        error: 'Stripe is not configured',
        reservationId: reservation.id,
      },
      { status: 503 }
    )
  }
  const origin = siteUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: guestEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Reservation deposit — ${listing.title as string}`,
            description: `${startDate} → ${endDate} (${nights} nights)`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    metadata: {
      reservation_id: reservation.id as string,
      listing_id: listingId,
      user_id: user.id,
    },
  })

  await supabase
    .from('reservations')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', reservation.id)

  return NextResponse.json({ url: session.url })
}
