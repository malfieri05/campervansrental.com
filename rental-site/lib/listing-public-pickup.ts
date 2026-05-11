import type { Van } from '@/types'

/**
 * Approximate pickup area from listing structured address only (city + region).
 * Never includes street or postal code — safe to show before booking.
 */
export function pickupAreaFromAddress(row: {
  address_city?: string | null
  address_state?: string | null
  address_country?: string | null
}): string | null {
  const city = row.address_city?.trim()
  const state = row.address_state?.trim()
  if (!city || !state) return null
  const country = (row.address_country ?? 'US').trim().toUpperCase()
  if (country && country !== 'US') {
    return `${city}, ${state} · ${country}`
  }
  return `${city}, ${state}`
}

/** Renter-facing pickup line: structured area when present, else marketplace region label. */
export function publicPickupLabelForListing(row: {
  location_label?: string | null
  address_city?: string | null
  address_state?: string | null
  address_country?: string | null
}): string {
  return pickupAreaFromAddress(row) || row.location_label?.trim() || ''
}

/** UI helper for `Van` loaded from `mapRowToVan`. */
export function vanPickupDisplay(van: Pick<Van, 'location' | 'pickupAreaPublic'>): string {
  const area = van.pickupAreaPublic?.trim()
  if (area) return area
  return van.location?.trim() || ''
}
