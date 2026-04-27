import { notFound } from 'next/navigation'
import ListingImageGallery from '@/components/listing/ListingImageGallery'
import ListingDetailBody from '@/components/listing/ListingDetailBody'
import { getBlockedRangesForListing } from '@/lib/availability'
import { getPublishedListingBySlug } from '@/lib/listings'

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

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <ListingImageGallery images={van.images} alt={van.name} />
        <ListingDetailBody van={van} blocks={blocks} pets={pets} smoking={smoking} />
      </div>
    </div>
  )
}
