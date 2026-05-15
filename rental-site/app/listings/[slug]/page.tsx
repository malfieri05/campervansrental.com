import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import ListingImageGallery from '@/components/listing/ListingImageGallery'
import ListingDetailBody from '@/components/listing/ListingDetailBody'
import ListingReviewsSection from '@/components/listing/ListingReviewsSection'
import { getBlockedRangesForListing } from '@/lib/availability'
import { getPublishedListingBySlug, getListingReviews } from '@/lib/listings'
import { siteUrl } from '@/lib/env'

/** Fetches and renders reviews — runs in its own Suspense boundary so the
 *  gallery and booking panel paint while reviews are still loading. */
async function ReviewsStream({ listingUuid, avgRating }: { listingUuid: string; avgRating: number | null }) {
  const reviews = await getListingReviews(listingUuid)
  return <ListingReviewsSection reviews={reviews} avgRating={avgRating ?? 0} />
}

function ReviewsFallback() {
  return (
    <div className="mt-12 pt-10 border-t border-cream-300/50 lg:max-w-[calc(100%-22rem)] space-y-4 animate-pulse">
      <div className="h-6 w-36 rounded bg-cream-300/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-cream-200/60 h-24" />
      ))}
    </div>
  )
}

export default async function ListingDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const van = await getPublishedListingBySlug(params.slug)
  if (!van) notFound()

  const blocks = van.listingUuid
    ? await getBlockedRangesForListing(van.listingUuid)
    : []

  const rules = (van.rules ?? {}) as Record<string, unknown>
  const pets = Boolean(rules.petsAllowed)
  const smoking = Boolean(rules.smokingAllowed)

  const shareUrl = `${siteUrl()}/listings/${params.slug}`

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Gallery — wider than body content */}
      <div className="w-full max-w-[88rem] mx-auto px-4 sm:px-6 pt-8">
        <ListingImageGallery
          images={van.images}
          alt={van.name}
          listingTitle={van.name}
          shareUrl={shareUrl}
        />
      </div>

      {/* Body — standard content width */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <ListingDetailBody van={van} blocks={blocks} pets={pets} smoking={smoking} />

        {/* Reviews stream in separately so gallery + booking bar paint first */}
        {van.listingUuid ? (
          <Suspense fallback={<ReviewsFallback />}>
            <ReviewsStream listingUuid={van.listingUuid} avgRating={van.rating} />
          </Suspense>
        ) : (
          <ListingReviewsSection reviews={[]} avgRating={van.rating ?? 0} />
        )}
      </div>
    </div>
  )
}
