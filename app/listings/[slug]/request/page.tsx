import { notFound } from 'next/navigation'
import { getPublishedListingBySlug } from '@/lib/listings'
import { getBlockedRangesForListing } from '@/lib/availability'
import RequestReviewClient from './RequestReviewClient'

export default async function RequestReviewPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { start?: string; end?: string; guests?: string }
}) {
  const van = await getPublishedListingBySlug(params.slug)
  if (!van) notFound()

  const blocks = van.listingUuid
    ? await getBlockedRangesForListing(van.listingUuid)
    : []

  return (
    <RequestReviewClient
      van={van}
      blocks={blocks}
      initialStart={searchParams.start ?? null}
      initialEnd={searchParams.end ?? null}
      initialGuests={searchParams.guests ? parseInt(searchParams.guests, 10) : 2}
    />
  )
}
