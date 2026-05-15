/**
 * Phase 3 — Mechanic public task feed with tagged ISR.
 *
 * Uses the same unstable_cache + revalidateTag pattern from lib/listings.ts:
 *  - anon client (no auth cookies) so the cached response is shared globally
 *  - tag 'mechanic-feed' is invalidated whenever a task's is_public_to_mechanics
 *    state changes (via server actions) or a new public task is inserted.
 *
 * Usage from server components:
 *   const tasks = await getPublicTasks({ lat, lng, radiusMiles, kinds })
 */

import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/anon'

export const MECHANIC_FEED_TAG = 'mechanic-feed'

export type PublicTask = {
  id: string
  listing_id: string
  kind: string
  title: string
  description: string | null
  priority: string
  due_at_date: string | null
  due_at_miles: number | null
  created_at: string
  updated_at: string
  listing_lat: number | null
  listing_lng: number | null
  location_label: string | null
  address_city: string | null
  address_state: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_class: string | null
}

// ─── Haversine distance (degrees → miles) ────────────────────────────────────

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Raw fetch (uses anon client — no auth required) ─────────────────────────

async function fetchPublicTasks(kinds?: string[]): Promise<PublicTask[]> {
  const supabase = createAnonClient()
  if (!supabase) return []

  let query = supabase
    .from('published_open_tasks')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (kinds && kinds.length > 0) {
    query = query.in('kind', kinds)
  }

  const { data } = await query
  return (data ?? []) as PublicTask[]
}

// ─── Cached public task list (all tasks, globally shared) ─────────────────────

export const getAllPublicTasks = unstable_cache(
  async (kinds?: string[]) => fetchPublicTasks(kinds),
  ['mechanic-feed-all'],
  { tags: [MECHANIC_FEED_TAG], revalidate: 60 }
)

// ─── Radius-filtered helper (called per-mechanic, not cached globally) ────────

export async function getPublicTasksInRadius(params: {
  lat: number
  lng: number
  radiusMiles: number
  kinds?: string[]
}): Promise<(PublicTask & { distanceMiles: number })[]> {
  const { lat, lng, radiusMiles, kinds } = params
  const allTasks = await getAllPublicTasks(kinds)

  return allTasks
    .map((t) => {
      const dist =
        t.listing_lat !== null && t.listing_lng !== null
          ? haversineDistanceMiles(lat, lng, t.listing_lat, t.listing_lng)
          : Infinity
      return { ...t, distanceMiles: dist }
    })
    .filter((t) => t.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}
