/**
 * Geocoding helper backed by the Mapbox Geocoding API.
 *
 * - Falls back to null on any error so save operations never break.
 * - Results are cached in the DB row itself (lat/lng columns), so this
 *   function is only called when address fields actually change.
 *
 * Requires env var: MAPBOX_TOKEN
 * Free tier: 100k geocodes/month — more than adequate for listing saves.
 */

export type GeoPoint = { lat: number; lng: number }

/**
 * Geocodes a US address string. Returns `{ lat, lng }` or `null` on failure.
 */
export async function geocodeAddress(params: {
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
}): Promise<GeoPoint | null> {
  const token = process.env.MAPBOX_TOKEN
  if (!token) {
    console.warn('[geocode] MAPBOX_TOKEN not set; skipping geocoding')
    return null
  }

  const { street, city, state, zip, country = 'US' } = params

  // Build a clean search string, omitting null parts.
  const parts = [street, city, state, zip, country].filter(Boolean) as string[]
  if (parts.length === 0) return null

  const query = encodeURIComponent(parts.join(', '))
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1&country=${country}`

  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) {
      console.warn(`[geocode] Mapbox responded ${res.status} for query: ${parts.join(', ')}`)
      return null
    }
    const json = (await res.json()) as {
      features?: { center?: [number, number] }[]
    }
    const center = json.features?.[0]?.center
    if (!center) return null
    const [lng, lat] = center // Mapbox returns [lng, lat]
    return { lat, lng }
  } catch (err) {
    console.warn('[geocode] Fetch error:', err)
    return null
  }
}
