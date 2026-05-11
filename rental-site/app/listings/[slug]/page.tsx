import { notFound } from 'next/navigation'
import ListingImageGallery from '@/components/listing/ListingImageGallery'
import ListingDetailBody from '@/components/listing/ListingDetailBody'
import ListingReviewsSection from '@/components/listing/ListingReviewsSection'
import { getBlockedRangesForListing, } from '@/lib/availability'
import { getPublishedListingBySlug, getListingReviews } from '@/lib/listings'
import { siteUrl } from '@/lib/env'

export default async function ListingDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const van = await getPublishedListingBySlug(params.slug)
  if (!van) notFound()

  const [blocks, reviews] = await Promise.all([
    van.listingUuid ? getBlockedRangesForListing(van.listingUuid) : Promise.resolve([]),
    van.listingUuid ? getListingReviews(van.listingUuid) : Promise.resolve([]),
  ])

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

        {/* Reviews section — below the grid, full content width */}
        <div className="mt-12 pt-10 border-t border-cream-300/50 lg:max-w-[calc(100%-22rem)]">
          <ListingReviewsSection reviews={reviews} avgRating={van.rating} />
        </div>
      </div>
    </div>
  )
}
