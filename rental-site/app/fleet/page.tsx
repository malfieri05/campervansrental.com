import type { Metadata } from 'next'
import FleetPageClient from '@/components/fleet/FleetPageClient'
import JsonLd from '@/components/seo/JsonLd'
import { filterFleetForHeroSearch, type HomeFleetSearchParams } from '@/lib/home-fleet-filter'
import { hasHomeFleetSearchFilters } from '@/lib/home-fleet-search-url'
import { getPublishedListings } from '@/lib/listings'
import { buildFleetMetadata, buildWebPageJsonLd } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...buildFleetMetadata(),
    alternates: { canonical: '/fleet' },
  }
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: HomeFleetSearchParams
}) {
  const listings = await getPublishedListings()
  const filtered = await filterFleetForHeroSearch(listings, searchParams)
  const searchFiltersActive = hasHomeFleetSearchFilters(searchParams)

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          name: 'Camper Vans for Rent',
          description: 'Browse peer-to-peer camper van and sprinter van rentals.',
          path: '/fleet',
        })}
      />
      <FleetPageClient
      listings={filtered}
      fleetTotalCount={listings.length}
      searchFiltersActive={searchFiltersActive}
    />
    </>
  )
}
