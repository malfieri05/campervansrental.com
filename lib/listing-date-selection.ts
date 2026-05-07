import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { dateRangesOverlapHalfOpen } from '@/lib/checkout'

/**
 * Same fields as `BlockRange` from `@/lib/availability` — defined here so client
 * components never import the server Supabase module.
 */
export type ListingCalendarBlock = {
  start: string
  end: string
}

/** yyyy-MM-dd for the user's local "today" (listing picker runs in the browser). */
export function todayDateKey(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd')
}

/** Half-open block [start, end): dayKey is unavailable if it falls inside any block. */
export function isDateInAnyBlock(dayKey: string, blocks: ListingCalendarBlock[]): boolean {
  return blocks.some((b) => dayKey >= b.start && dayKey < b.end)
}

/** Trip nights [tripStart, tripEndExclusive) overlaps any unavailable block (host, booking, iCal sync). */
export function tripRangeOverlapsBlocks(
  tripStart: string,
  tripEndExclusive: string,
  blocks: ListingCalendarBlock[]
): boolean {
  return blocks.some((b) => dateRangesOverlapHalfOpen(tripStart, tripEndExclusive, b.start, b.end))
}

function addDaysKey(isoDay: string, days: number): string {
  return format(addDays(parseISO(`${isoDay}T12:00:00`), days), 'yyyy-MM-dd')
}

/**
 * Listing date picker: enforce past/today, blocked nights, min stay, and range not crossing blocks.
 * Returns null if the click should be ignored.
 */
export function resolveListingDateClick(args: {
  key: string
  checkIn: string | null
  checkOut: string | null
  blocks: ListingCalendarBlock[]
  minNights: number
}): { checkIn: string | null; checkOut: string | null } | null {
  const { key, blocks, minNights } = args
  const { checkIn, checkOut } = args
  const today = todayDateKey()
  if (key < today) return null

  if (!checkIn || (checkIn && checkOut)) {
    if (isDateInAnyBlock(key, blocks)) return null
    return { checkIn: key, checkOut: null }
  }

  if (key <= checkIn) {
    if (isDateInAnyBlock(key, blocks)) return null
    return { checkIn: key, checkOut: null }
  }

  const minCheckout = addDaysKey(checkIn, minNights)
  if (key < minCheckout) return null
  if (tripRangeOverlapsBlocks(checkIn, key, blocks)) return null
  return { checkIn, checkOut: key }
}
