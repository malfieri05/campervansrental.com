import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id
  if (!sessionId) {
    redirect('/booking')
  }

  const stripe = getStripe()
  let paid = false
  let listingTitle: string | null = null

  if (stripe) {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    paid = session.payment_status === 'paid'

    const reservationId = session.metadata?.reservation_id
    const svc = createServiceRoleClient()
    if (svc && reservationId) {
      const { data: resv } = await svc
        .from('reservations')
        .select('listing_id')
        .eq('id', reservationId)
        .maybeSingle()
      if (resv?.listing_id) {
        const { data: listing } = await svc
          .from('listings')
          .select('title')
          .eq('id', resv.listing_id)
          .maybeSingle()
        listingTitle = (listing?.title as string) ?? null
      }
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-20 px-6">
      <div className="max-w-xl mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-10 shadow-luxury-sm text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-charcoal">
          {paid ? 'You are booked' : 'Payment received'}
        </h1>
        <p className="font-sans text-sm text-charcoal/55">
          {listingTitle
            ? `Your reservation for ${listingTitle} is confirmed once payment succeeds.`
            : 'Thank you — your reservation deposit is processing.'}
        </p>
        <Link
          href="/fleet"
          className="inline-flex font-display text-xs font-bold uppercase tracking-widest text-forest-800 hover:text-gold-600"
        >
          Back to fleet
        </Link>
      </div>
    </div>
  )
}
