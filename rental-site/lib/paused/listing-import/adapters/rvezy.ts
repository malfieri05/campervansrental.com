/**
 * RVezy-specific extraction adapter.
 *
 * RVezy embeds listing data in `window.__INITIAL_STATE__` or a
 * `<script id="__NEXT_DATA__">` blob (they migrated to Next.js).
 * We check both. Falls back to returning empty if the structure changes.
 */

import * as cheerio from 'cheerio'
import type { ExtractedListing } from '../types'

type Obj = Record<string, unknown>

function str(o: Obj, k: string): string | undefined {
  const v = o[k]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function num(o: Obj, k: string): number | undefined {
  const v = o[k]
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isFinite(n) ? n : undefined
  }
  return undefined
}

/** Find a node that looks like an RV listing (make + model typically present). */
function findListingNode(value: unknown, depth = 0): Obj | null {
  if (!value || typeof value !== 'object' || depth > 8) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const f = findListingNode(item, depth + 1)
      if (f) return f
    }
    return null
  }
  const obj = value as Obj
  if ((obj['make'] || obj['rvMake'] || obj['rv_make']) && (obj['model'] || obj['rvModel'] || obj['rv_model'])) {
    return obj
  }
  for (const v of Object.values(obj)) {
    const f = findListingNode(v, depth + 1)
    if (f) return f
  }
  return null
}

function extractImages(node: Obj): string[] {
  const urls: string[] = []
  for (const key of ['images', 'photos', 'gallery', 'pictures', 'media']) {
    const arr = node[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'string' && item.startsWith('http')) { urls.push(item); continue }
      if (typeof item === 'object' && item !== null) {
        const o = item as Obj
        const url = str(o, 'url') ?? str(o, 'src') ?? str(o, 'original') ?? str(o, 'large')
        if (url?.startsWith('http')) urls.push(url)
      }
    }
  }
  return urls
}

function extractAmenities(node: Obj): string[] {
  const tags: string[] = []
  for (const key of ['features', 'amenities', 'amenitiesList', 'rvAmenities', 'options']) {
    const arr = node[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'string') tags.push(item)
      else if (typeof item === 'object' && item !== null) {
        const label = str(item as Obj, 'name') ?? str(item as Obj, 'label')
        if (label) tags.push(label)
      }
    }
  }
  return tags
}

/** Extract from `window.__INITIAL_STATE__ = {...}` inline script pattern. */
function parseInitialState(html: string): unknown {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

export function extractRvezy(html: string): ExtractedListing {
  const $ = cheerio.load(html)

  // Try __NEXT_DATA__ first (newer builds)
  let rootData: unknown = null
  const nextDataScript = $('#__NEXT_DATA__').html()
  if (nextDataScript) {
    try { rootData = JSON.parse(nextDataScript) } catch { /* noop */ }
  }

  // Fall back to __INITIAL_STATE__
  if (!rootData) rootData = parseInitialState(html)
  if (!rootData) return {}

  const listing = findListingNode(rootData)
  if (!listing) return {}

  const result: ExtractedListing = {}

  result.title = str(listing, 'name') ?? str(listing, 'title')
  result.description = str(listing, 'description') ?? str(listing, 'rvDescription')
  result.vehicle_make = str(listing, 'make') ?? str(listing, 'rvMake') ?? str(listing, 'rv_make')
  result.vehicle_model = str(listing, 'model') ?? str(listing, 'rvModel') ?? str(listing, 'rv_model')

  const rawYear = num(listing, 'year') ?? num(listing, 'rvYear') ?? num(listing, 'rv_year')
  if (rawYear && rawYear > 1980 && rawYear <= new Date().getFullYear() + 1) {
    result.vehicle_year = rawYear
  }

  const rawSleeps = num(listing, 'sleeps') ?? num(listing, 'sleepCount') ?? num(listing, 'maxGuests')
  if (rawSleeps && rawSleeps <= 20) result.sleeps = Math.round(rawSleeps)

  const rawSeatbelts = num(listing, 'seatbelts') ?? num(listing, 'seatBelts')
  if (rawSeatbelts && rawSeatbelts <= 20) result.seatbelts = Math.round(rawSeatbelts)

  const rawLength = num(listing, 'length') ?? num(listing, 'rvLength')
  if (rawLength && rawLength > 5 && rawLength < 100) {
    result.length_label = `${rawLength} ft`
  }

  const priceDay = num(listing, 'dailyRate') ?? num(listing, 'price') ?? num(listing, 'pricePerNight')
  if (priceDay && priceDay > 0) {
    result.price_per_night_dollars = priceDay > 10000 ? Math.round(priceDay / 100) : priceDay
  }

  const loc = str(listing, 'city') ?? str(listing, 'location') ?? str(listing, 'locationLabel')
  if (loc) result.location_label = loc

  result.image_urls = extractImages(listing)
  result.amenity_strings = extractAmenities(listing)

  return result
}
