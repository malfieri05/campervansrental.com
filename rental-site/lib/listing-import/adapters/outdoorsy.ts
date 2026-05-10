/**
 * Outdoorsy-specific extraction adapter.
 *
 * Outdoorsy is a Next.js app that embeds the listing data inside
 * `<script id="__NEXT_DATA__">` as a JSON blob. We walk the `props.pageProps`
 * tree to find the rental/vehicle object.
 *
 * Falls back gracefully — if the structure changes we return an empty partial
 * and the generic extractor will cover JSON-LD / meta.
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

/** Deeply search a JSON tree for a key containing "rental" or "vehicle" data. */
function findRentalNode(value: unknown, depth = 0): Obj | null {
  if (!value || typeof value !== 'object' || depth > 8) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRentalNode(item, depth + 1)
      if (found) return found
    }
    return null
  }
  const obj = value as Obj
  // Outdoorsy rental object usually has make + model + year at the same level
  if (
    (obj['make'] || obj['vehicle_make']) &&
    (obj['model'] || obj['vehicle_model']) &&
    (obj['year'] || obj['vehicle_year'])
  ) {
    return obj
  }
  for (const v of Object.values(obj)) {
    const found = findRentalNode(v, depth + 1)
    if (found) return found
  }
  return null
}

function extractImages(rental: Obj): string[] {
  const urls: string[] = []
  for (const key of ['photos', 'images', 'pictures']) {
    const arr = rental[key]
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string' && item.startsWith('http')) urls.push(item)
        if (typeof item === 'object' && item !== null) {
          const o = item as Obj
          const url = (str(o, 'fullUrl') ?? str(o, 'url') ?? str(o, 'src') ?? str(o, 'large'))
          if (url?.startsWith('http')) urls.push(url)
        }
      }
    }
  }
  return urls
}

function extractAmenities(rental: Obj): string[] {
  const tags: string[] = []
  for (const key of ['amenities', 'features', 'tags', 'options']) {
    const arr = rental[key]
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string') tags.push(item)
        if (typeof item === 'object' && item !== null) {
          const label = str(item as Obj, 'name') ?? str(item as Obj, 'label') ?? str(item as Obj, 'title')
          if (label) tags.push(label)
        }
      }
    }
  }
  return tags
}

export function extractOutdoorsy(html: string): ExtractedListing {
  const $ = cheerio.load(html)
  const nextDataScript = $('#__NEXT_DATA__').html()
  if (!nextDataScript) return {}

  let nextData: unknown
  try { nextData = JSON.parse(nextDataScript) } catch { return {} }

  const rental = findRentalNode(nextData)
  if (!rental) return {}

  const result: ExtractedListing = {}

  result.title = str(rental, 'name') ?? str(rental, 'title')
  result.description = str(rental, 'description')
  result.vehicle_make = str(rental, 'make') ?? str(rental, 'vehicle_make')
  result.vehicle_model = str(rental, 'model') ?? str(rental, 'vehicle_model')

  const rawYear = num(rental, 'year') ?? num(rental, 'vehicle_year')
  if (rawYear && rawYear > 1980 && rawYear <= new Date().getFullYear() + 1) {
    result.vehicle_year = rawYear
  }

  const rawSleeps = num(rental, 'sleeps') ?? num(rental, 'sleep_number') ?? num(rental, 'passengers')
  if (rawSleeps && rawSleeps <= 20) result.sleeps = Math.round(rawSleeps)

  const rawSeatbelts = num(rental, 'seatbelts') ?? num(rental, 'seat_belts')
  if (rawSeatbelts && rawSeatbelts <= 20) result.seatbelts = Math.round(rawSeatbelts)

  // Length
  const rawLength = num(rental, 'length') ?? num(rental, 'vehicle_length')
  if (rawLength && rawLength > 5 && rawLength < 100) {
    result.length_label = `${rawLength} ft`
  }

  // Price per night (Outdoorsy stores day rate in cents or dollars depending on endpoint)
  const priceDay = num(rental, 'price_per_day') ?? num(rental, 'day_rate') ?? num(rental, 'base_price')
  if (priceDay && priceDay > 0) {
    // Outdoorsy API sometimes uses dollars, sometimes cents — heuristic: if > 10,000 treat as cents
    result.price_per_night_dollars = priceDay > 10000 ? Math.round(priceDay / 100) : priceDay
  }

  // Location
  const loc = str(rental, 'location') ?? str(rental, 'city')
  if (loc) result.location_label = loc

  result.image_urls = extractImages(rental)
  result.amenity_strings = extractAmenities(rental)

  return result
}
