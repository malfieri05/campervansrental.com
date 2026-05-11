/**
 * Pure helpers for home hero ↔ URL query string and listing location utilities.
 * Safe to import from Client Components (no server / Supabase).
 */

import type { Van } from '@/types'

/** Distinct non-empty pickup labels from published listings. */
export function uniquePublishedPickupLabels(listings: Van[]): string[] {
  const set = new Set<string>()
  for (const v of listings) {
    const t = (v.location ?? '').trim()
    if (t) set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

const FALLBACK_PICKUP_LABELS = [
  'Denver, CO',
  'Salt Lake City, UT',
  'Bozeman, MT',
  'Aspen, CO',
  'Portland, OR',
  'Seattle, WA',
] as const

/** Labels for hero / booking dropdowns when no published listing has a location set. */
export function effectivePickupLabels(listings: Van[]): string[] {
  const unique = uniquePublishedPickupLabels(listings)
  return unique.length > 0 ? unique : [...FALLBACK_PICKUP_LABELS]
}

export type HomeFleetSearchParams = {
  checkIn?: string
  checkOut?: string
  guests?: string
  location?: string
}

/** True when URL carries any hero / fleet filter the user explicitly set. */
export function hasHomeFleetSearchFilters(search: HomeFleetSearchParams): boolean {
  if ((search.location ?? '').trim()) return true
  if ((search.checkIn ?? '').trim()) return true
  if ((search.checkOut ?? '').trim()) return true
  const g = (search.guests ?? '').trim()
  if (g && g !== '2') return true
  return false
}

/** True if two query strings represent the same key/value pairs (order-independent). */
export function heroFleetQueriesEquivalent(a: string, b: string): boolean {
  const pa = new URLSearchParams(a.startsWith('?') ? a.slice(1) : a)
  const pb = new URLSearchParams(b.startsWith('?') ? b.slice(1) : b)
  const keysA = Array.from(new Set(Array.from(pa.keys()))).sort()
  const keysB = Array.from(new Set(Array.from(pb.keys()))).sort()
  if (keysA.length !== keysB.length) return false
  if (keysA.some((k, i) => k !== keysB[i])) return false
  return keysA.every((k) => pa.get(k) === pb.get(k))
}

/** Build query string for `/` — must match what `HomePage` reads from `searchParams`. */
export function serializeHeroFleetSearch(args: {
  location: string
  checkIn: string
  checkOut: string
  guests: number
}): string {
  const params = new URLSearchParams()
  const loc = args.location.trim()
  if (loc) params.set('location', loc)
  if (args.checkIn) params.set('checkIn', args.checkIn)
  if (args.checkOut) params.set('checkOut', args.checkOut)
  if (args.guests !== 2 || (args.checkIn && args.checkOut) || loc) {
    params.set('guests', String(args.guests))
  }
  return params.toString()
}
