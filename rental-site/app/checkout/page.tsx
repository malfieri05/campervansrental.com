import { Suspense } from 'react'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import { getPublishedListings } from '@/lib/listings'

export const dynamic = 'force-dynamic'

async function CheckoutPageInner({
  searchParams,
}: {
  searchParams: { listing?: string; start?: string; end?: string; guests?: string }
}) {
  // Load all listings to find summary data for the sticky sidebar
  const listings = await getPublishedListings()
  const van = listings.find((v) => v.listingUuid === searchParams.listing) ?? null

  return (
    <CheckoutClient
      van={van}
      listingId={searchParams.listing ?? ''}
      startDate={searchParams.start ?? ''}
      endDate={searchParams.end ?? ''}
      guests={searchParams.guests ? parseInt(searchParams.guests, 10) : 2}
    />
  )
}

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { listing?: string; start?: string; end?: string; guests?: string; cancelled?: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 pt-8 px-6 font-sans text-charcoal/60">
          Loading checkout…
        </div>
      }
    >
      <CheckoutPageInner searchParams={searchParams} />
    </Suspense>
  )
}
