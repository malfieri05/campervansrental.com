import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'

export type BlockRange = {
  start: string
  end: string
  type: 'host_blocked' | 'confirmed_reservation' | 'external_sync'
}

export async function getBlockedRangesForListing(
  listingId: string
): Promise<BlockRange[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('availability_blocks')
      .select('start_date, end_date, block_type')
      .eq('listing_id', listingId)
      .order('start_date', { ascending: true })

    if (error || !data) return []

    return data.map((row) => ({
      start: row.start_date as string,
      end: row.end_date as string,
      type: row.block_type as BlockRange['type'],
    }))
  } catch {
    return []
  }
}

/** Batch-load availability blocks for many listings (one query). */
export async function getBlockedRangesByListingIds(
  listingIds: string[]
): Promise<Map<string, BlockRange[]>> {
  const map = new Map<string, BlockRange[]>()
  if (!isSupabaseConfigured() || listingIds.length === 0) return map

  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return map

    const { data, error } = await supabase
      .from('availability_blocks')
      .select('listing_id, start_date, end_date, block_type')
      .in('listing_id', listingIds)
      .order('start_date', { ascending: true })

    if (error || !data) return map

    for (const row of data) {
      const lid = row.listing_id as string
      const list = map.get(lid) ?? []
      list.push({
        start: row.start_date as string,
        end: row.end_date as string,
        type: row.block_type as BlockRange['type'],
      })
      map.set(lid, list)
    }
    return map
  } catch {
    return map
  }
}
