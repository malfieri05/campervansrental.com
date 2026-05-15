/**
 * Phase 2 — calendar-aware external trip helpers.
 * Surfaces availability_blocks that represent off-platform trips (external_sync)
 * that haven't yet had a mileage log entry created for them.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ExternalBlock = {
  id: string
  listing_id: string
  start_date: string
  end_date: string
  block_type: string
  reservation_id: string | null
}

/**
 * Returns availability_blocks that:
 *  1. Have block_type = 'external_sync'
 *  2. end_date <= today (the trip is complete)
 *  3. Have NO matching vehicle_mileage_logs.external_block_id row
 */
export async function getUnclaimedExternalBlocks(listingId: string): Promise<ExternalBlock[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const today = new Date().toISOString().split('T')[0]

  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('id, listing_id, start_date, end_date, block_type, reservation_id')
    .eq('listing_id', listingId)
    .eq('block_type', 'external_sync')
    .lte('end_date', today)
    .order('end_date', { ascending: false })

  if (!blocks || blocks.length === 0) return []

  // Find which block IDs already have a mileage log.
  const blockIds = blocks.map((b) => b.id)
  const { data: claimed } = await supabase
    .from('vehicle_mileage_logs')
    .select('external_block_id')
    .in('external_block_id', blockIds)

  const claimedSet = new Set((claimed ?? []).map((r: { external_block_id: string | null }) => r.external_block_id))

  return (blocks as ExternalBlock[]).filter((b) => !claimedSet.has(b.id))
}

/**
 * Returns a total trip count for a listing:
 * confirmed platform reservations + all external_sync availability blocks.
 */
export async function getTotalTripCount(listingId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return 0

  const [platformResult, externalResult] = await Promise.all([
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('status', 'confirmed'),
    supabase
      .from('availability_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('block_type', 'external_sync'),
  ])

  return (platformResult.count ?? 0) + (externalResult.count ?? 0)
}
