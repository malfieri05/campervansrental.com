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
