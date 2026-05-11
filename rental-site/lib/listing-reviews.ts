/**
 * Client-side mirror of the SQL review-eligibility rules in migration 00013.
 *
 * Deadline rule (must stay in sync with SQL policy):
 *   eligible to review when:
 *     - reservation status === 'confirmed'
 *     - trip has ended (today > end_date)
 *     - now < end_date + 2 calendar days (UTC)
 */

import { addDays, parseISO, isAfter, isBefore } from 'date-fns'
import { format } from 'date-fns'

/** ISO date string from the DB, e.g. "2026-05-10" */
type ISODate = string

/** Exclusive deadline timestamp after which a review can no longer be submitted. */
export function reviewDeadline(endDate: ISODate): Date {
  return addDays(parseISO(endDate), 2)
}

/** True if the trip is confirmed and has ended. */
export function isTripCompletedForReview(endDate: ISODate, status: string): boolean {
  if (status !== 'confirmed') return false
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return isAfter(today, parseISO(endDate))
}

/** True if the 48-hour review window is still open. */
export function isWithinReviewWindow(endDate: ISODate): boolean {
  return isBefore(new Date(), reviewDeadline(endDate))
}

/** Whether a review is eligible: trip completed AND window open AND no existing review. */
export function isReviewEligible(
  endDate: ISODate,
  status: string,
  hasReview: boolean
): boolean {
  if (hasReview) return false
  return isTripCompletedForReview(endDate, status) && isWithinReviewWindow(endDate)
}

/** Human-readable deadline label, e.g. "May 13, 2026 at midnight UTC". */
export function reviewDeadlineLabel(endDate: ISODate): string {
  try {
    return format(reviewDeadline(endDate), "MMM d, yyyy 'at midnight UTC'")
  } catch {
    return ''
  }
}

export type ListingReview = {
  id: string
  listing_id: string
  reservation_id: string
  author_id: string
  /** Display name from profiles; null for deleted accounts. */
  author_name: string | null
  rating: number
  body: string | null
  created_at: string
}
