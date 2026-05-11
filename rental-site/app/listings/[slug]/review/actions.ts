'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isTripCompletedForReview, isWithinReviewWindow } from '@/lib/listing-reviews'
import { redirect } from 'next/navigation'

export type SubmitReviewResult =
  | { success: true }
  | { success: false; error: string }

export async function submitReview(
  listingSlug: string,
  reservationId: string,
  rating: number,
  body: string
): Promise<SubmitReviewResult> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { success: false, error: 'Service unavailable. Please try again later.' }

  // Verify the user is authenticated.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in to leave a review.' }

  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Please select a star rating between 1 and 5.' }
  }

  // Validate body length
  if (body.length > 2000) {
    return { success: false, error: 'Review text must be 2,000 characters or fewer.' }
  }

  // Fetch the reservation server-side to verify eligibility.
  const { data: reservation, error: resErr } = await supabase
    .from('reservations')
    .select('id, listing_id, renter_id, status, end_date, listings!inner(id, slug)')
    .eq('id', reservationId)
    .maybeSingle()

  if (resErr || !reservation) {
    return { success: false, error: 'Reservation not found.' }
  }

  // Must be the renter.
  if (reservation.renter_id !== user.id) {
    return { success: false, error: 'You are not authorised to review this trip.' }
  }

  // Slug must match the listing.
  const listing = Array.isArray(reservation.listings)
    ? reservation.listings[0]
    : reservation.listings
  if ((listing as { slug: string } | null)?.slug !== listingSlug) {
    return { success: false, error: 'Reservation does not match this listing.' }
  }

  // Eligibility checks (mirrors SQL policy).
  if (!isTripCompletedForReview(reservation.end_date as string, reservation.status as string)) {
    return { success: false, error: 'Your trip must be completed before you can leave a review.' }
  }
  if (!isWithinReviewWindow(reservation.end_date as string)) {
    return { success: false, error: 'The 48-hour review window for this trip has closed.' }
  }

  // Check for an existing review.
  const { data: existing } = await supabase
    .from('listing_reviews')
    .select('id')
    .eq('reservation_id', reservationId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'You have already submitted a review for this trip.' }
  }

  // Insert — RLS also enforces eligibility as a second layer.
  const { error: insertErr } = await supabase.from('listing_reviews').insert({
    listing_id: reservation.listing_id,
    reservation_id: reservationId,
    author_id: user.id,
    rating,
    body: body.trim() || null,
  })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return { success: false, error: 'You have already submitted a review for this trip.' }
    }
    return { success: false, error: 'Could not save your review. Please try again.' }
  }

  return { success: true }
}

/** Used by the page to redirect after a successful submit. */
export async function redirectToListing(slug: string) {
  redirect(`/listings/${slug}#reviews`)
}
