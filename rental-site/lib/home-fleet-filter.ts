import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Van } from '@/types'
import { getBlockedRangesByListingIds } from '@/lib/availability'
import { tripRangeOverlapsBlocks } from '@/lib/listing-date-selection'
import type { HomeFleetSearchParams } from '@/lib/home-fleet-search-url'

export type { HomeFleetSearchParams } from '@/lib/home-fleet-search-url'

function parseGuests(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  return n
}

/**
 * Filters published vans for the home “curated fleet” based on hero search:
 * - location: exact match on `van.location` when provided
 * - guests: `sleeps >= guests`
 * - checkIn + checkOut: trip range must not overlap any availability block, and nights >= minNights
 */
export async function filterFleetForHeroSearch(
  listings: Van[],
  search: HomeFleetSearchParams
): Promise<Van[]> {
  let out = [...listings]

  const location = search.location?.trim()
  if (location) {
    out = out.filter((v) => (v.location ?? '').trim() === location)
  }

  const guests = parseGuests(search.guests)
  if (guests != null) {
    out = out.filter((v) => v.sleeps >= guests)
  }

  const checkIn = search.checkIn?.trim()
  const checkOut = search.checkOut?.trim()
  if (checkIn && checkOut && checkOut > checkIn) {
    const withUuid = out.filter((v) => v.listingUuid)
    const ids = withUuid.map((v) => v.listingUuid as string)
    const blocksByListing = await getBlockedRangesByListingIds(ids)

    out = out.filter((v) => {
      if (!v.listingUuid) {
        // Static / demo vans without a DB row — treat as available for dates.
        return true
      }
      const blocks = blocksByListing.get(v.listingUuid) ?? []
      if (tripRangeOverlapsBlocks(checkIn, checkOut, blocks)) return false
      const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
      const minN = v.minNights ?? 1
      if (nights < minN) return false
      return true
    })
  }

  return out
}
