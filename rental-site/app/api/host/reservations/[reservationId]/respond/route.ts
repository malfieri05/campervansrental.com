import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { sendBookingConfirmationForReservationId } from '@/lib/booking-confirmation-from-reservation'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const { reservationId } = await params

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'accept' && action !== 'deny') {
    return NextResponse.json({ error: 'action must be "accept" or "deny"' }, { status: 400 })
  }

  /** Used for refund / accept gating; undefined if Stripe missing or retrieval failed */
  async function checkoutSessionPaid(
    stripe: NonNullable<ReturnType<typeof getStripe>>,
    sessionId: string | null
  ): Promise<boolean | null> {
    if (!sessionId) return false
    try {
      const sess = await stripe.checkout.sessions.retrieve(sessionId)
      return sess.payment_status === 'paid'
    } catch {
      return null
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceRoleClient()
  if (!svc) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })

  const { data: row } = await svc
    .from('reservations')
    .select(
      `
      id,
      listing_id,
      status,
      start_date,
      end_date,
      stripe_checkout_session_id,
      listings!inner ( owner_id )
    `
    )
    .eq('id', reservationId)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const listingsEmb = row.listings as { owner_id: string } | { owner_id: string }[] | null | undefined
  const ownerId = Array.isArray(listingsEmb) ? listingsEmb[0]?.owner_id : listingsEmb?.owner_id
  if (!ownerId || ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rowStatus = row.status as string
  if (rowStatus !== 'pending_host' && rowStatus !== 'pending_payment') {
    return NextResponse.json({ error: 'This reservation cannot be acted on here.' }, { status: 400 })
  }

  const sessionId = row.stripe_checkout_session_id as string | null
  const stripe = getStripe()
  const paidResolved = stripe ? await checkoutSessionPaid(stripe, sessionId) : null

  if (action === 'accept') {
    const canAccept =
      (rowStatus === 'pending_payment' && paidResolved === true) ||
      (rowStatus === 'pending_host' && paidResolved !== false)

    if (!canAccept) {
      if (rowStatus === 'pending_payment') {
        return NextResponse.json(
          {
            error:
              'The guest has not finished paying yet. Accept will be available after their reservation fee clears. If they paid already, wait a moment and refresh.',
          },
          { status: 400 },
        )
      }
      return NextResponse.json(
        { error: 'Payment verification failed for this request. Try again or contact support.' },
        { status: 400 },
      )
    }

    const { data: updatedRow, error: updErr } = await svc
      .from('reservations')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', reservationId)
      .in('status', ['pending_host', 'pending_payment'])
      .select('id')
      .maybeSingle()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    if (!updatedRow) {
      return NextResponse.json({ error: 'This reservation was already updated.' }, { status: 409 })
    }

    const { data: existingBlock } = await svc
      .from('availability_blocks')
      .select('id')
      .eq('reservation_id', reservationId)
      .maybeSingle()

    if (!existingBlock) {
      const { error: blockErr } = await svc.from('availability_blocks').insert({
        listing_id: row.listing_id,
        start_date: row.start_date,
        end_date: row.end_date,
        block_type: 'confirmed_reservation',
        reservation_id: reservationId,
      })
      if (blockErr) {
        console.error('[host respond] block insert failed:', blockErr)
        await svc
          .from('reservations')
          .update({
            status: rowStatus as 'pending_host' | 'pending_payment',
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservationId)
        return NextResponse.json({ error: 'Could not update calendar' }, { status: 500 })
      }
    }

    try {
      await sendBookingConfirmationForReservationId(svc, reservationId)
    } catch (e) {
      console.error('[host respond] confirmation email failed:', e)
    }

    return NextResponse.json({ ok: true, status: 'confirmed' })
  }

  // deny — refund reservation fee only when this Checkout session is actually paid (authoritative retrieve).
  if (stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      })
      if (session.payment_status === 'paid') {
        const pi = session.payment_intent
        const paymentIntentId = typeof pi === 'string' ? pi : pi?.id
        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId })
        }
      }
    } catch (e) {
      console.error('[host respond] stripe refund failed:', e)
      return NextResponse.json(
        { error: 'Could not process refund or load payment. Try again or contact support.' },
        { status: 502 },
      )
    }
  }

  const { error: cancelErr } = await svc
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', reservationId)
    .in('status', ['pending_host', 'pending_payment'])

  if (cancelErr) {
    return NextResponse.json({ error: cancelErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
