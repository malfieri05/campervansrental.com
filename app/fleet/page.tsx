import FleetPageClient from '@/components/fleet/FleetPageClient'
import { getPublishedListings } from '@/lib/listings'

export default async function FleetPage() {
  const listings = await getPublishedListings()
  return <FleetPageClient listings={listings} />
}
