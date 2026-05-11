import Hero from '@/components/home/Hero'
import FeaturedVans from '@/components/home/FeaturedVans'
import HowItWorks from '@/components/home/HowItWorks'
import { effectivePickupLabels, getPublishedListings } from '@/lib/listings'
import { filterFleetForHeroSearch, type HomeFleetSearchParams } from '@/lib/home-fleet-filter'

function initialGuestsFromSearch(guests: string | undefined): number {
  const n = guests != null && guests !== '' ? parseInt(guests, 10) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n
  return 2
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: HomeFleetSearchParams
}) {
  const listings = await getPublishedListings()
  const pickupLocations = effectivePickupLabels(listings)
  const fleetListings = await filterFleetForHeroSearch(listings, searchParams)

  const initialGuests = initialGuestsFromSearch(searchParams.guests)

  return (
    <>
      <Hero
        pickupLocations={pickupLocations}
        initialLocation={searchParams.location ?? ''}
        initialCheckIn={searchParams.checkIn ?? ''}
        initialCheckOut={searchParams.checkOut ?? ''}
        initialGuests={initialGuests}
      />
      <FeaturedVans listings={fleetListings} />
      <HowItWorks />
    </>
  )
}
