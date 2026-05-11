import FleetPageClient from '@/components/fleet/FleetPageClient'
import { filterFleetForHeroSearch, type HomeFleetSearchParams } from '@/lib/home-fleet-filter'
import { hasHomeFleetSearchFilters } from '@/lib/home-fleet-search-url'
import { getPublishedListings } from '@/lib/listings'

export default async function FleetPage({
  searchParams,
}: {
  searchParams: HomeFleetSearchParams
}) {
  const listings = await getPublishedListings()
  const filtered = await filterFleetForHeroSearch(listings, searchParams)
  const searchFiltersActive = hasHomeFleetSearchFilters(searchParams)

  return (
    <FleetPageClient
      listings={filtered}
      fleetTotalCount={listings.length}
      searchFiltersActive={searchFiltersActive}
    />
  )
}
