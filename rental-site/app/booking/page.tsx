import BookingWizard from '@/components/booking/BookingWizard'
import { getPublishedListings } from '@/lib/listings'

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { listing?: string; checkIn?: string; checkOut?: string; guests?: string }
}) {
  const listings = await getPublishedListings()
  const guestsNum = searchParams.guests ? parseInt(searchParams.guests, 10) : undefined
  return (
    <BookingWizard
      initialListings={listings}
      preselectSlug={searchParams.listing}
      initialCheckIn={searchParams.checkIn}
      initialCheckOut={searchParams.checkOut}
      initialGuests={Number.isFinite(guestsNum) ? guestsNum : undefined}
    />
  )
}
