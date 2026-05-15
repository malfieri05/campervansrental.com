import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isStripeWebhookConfigured } from '@/lib/env'

export const runtime = 'nodejs'

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

    const { data: resv } = await svc
      .from('reservations')
      .select('id, status')
      .eq('id', reservationId)
      .maybeSingle()

    if (!resv || resv.status !== 'pending_payment') {
      return NextResponse.json({ received: true })
    }

    // Reservation fee paid — host must accept before we confirm, block calendar, and email the guest.
    await svc
      .from('reservations')
      .update({ status: 'pending_host', updated_at: new Date().toISOString() })
      .eq('id', reservationId)
      .eq('status', 'pending_payment')
  }

  return NextResponse.json({ received: true })
}
