import BookingWizard from '@/components/booking/BookingWizard'
import { getPublishedListings } from '@/lib/listings'

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { listing?: string }
}) {
  const listings = await getPublishedListings()
  return (
    <BookingWizard initialListings={listings} preselectSlug={searchParams.listing} />
  )
}
