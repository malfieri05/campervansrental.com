import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPublishedListingBySlug } from '@/lib/listings'
import { isTripCompletedForReview, isWithinReviewWindow } from '@/lib/listing-reviews'
import ReviewForm from './ReviewForm'

export default async function WriteReviewPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { reservation?: string }
}) {
  const reservationId = searchParams.reservation?.trim()
  if (!reservationId) notFound()

  const [van, supabase] = await Promise.all([
    getPublishedListingBySlug(params.slug),
    createServerSupabaseClient(),
  ])

  if (!van) notFound()
  if (!supabase) redirect('/auth/login?next=' + encodeURIComponent(`/listings/${params.slug}/review?reservation=${reservationId}`))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/listings/${params.slug}/review?reservation=${reservationId}`)}`
    )
  }

  // Verify eligibility server-side so we can show a clear error page instead of
  // letting the form submit and fail.
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, renter_id, status, end_date, listing_id')
    .eq('id', reservationId)
    .maybeSingle()

  if (!reservation || reservation.renter_id !== user.id) notFound()
  if (reservation.listing_id !== van.listingUuid) notFound()

  const completed = isTripCompletedForReview(
    reservation.end_date as string,
    reservation.status as string
  )
  const inWindow = isWithinReviewWindow(reservation.end_date as string)

  // Check if already reviewed
  const { data: existing } = await supabase
    .from('listing_reviews')
    .select('id')
    .eq('reservation_id', reservationId)
    .maybeSingle()

  const canReview = completed && inWindow && !existing

  return (
    <div className="min-h-screen bg-cream-100 py-10 px-4">
      <div className="max-w-lg mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-6 sm:p-10 shadow-luxury-sm">
        {!completed && (
          <div className="text-center py-6">
            <p className="font-serif text-xl font-semibold text-charcoal mb-2">Trip not yet completed</p>
            <p className="font-sans text-sm text-charcoal/55">
              Reviews open once your trip has ended.
            </p>
          </div>
        )}

        {completed && !inWindow && (
          <div className="text-center py-6">
            <p className="font-serif text-xl font-semibold text-charcoal mb-2">Review window closed</p>
            <p className="font-sans text-sm text-charcoal/55">
              The 48-hour window to leave a review for this trip has passed.
            </p>
          </div>
        )}

        {completed && inWindow && existing && (
          <div className="text-center py-6">
            <p className="font-serif text-xl font-semibold text-charcoal mb-2">Already reviewed</p>
            <p className="font-sans text-sm text-charcoal/55">
              You have already submitted a review for this trip.
            </p>
          </div>
        )}

        {canReview && (
          <ReviewForm
            slug={params.slug}
            reservationId={reservationId}
            vanName={van.name}
            tripEndDate={reservation.end_date as string}
          />
        )}
      </div>
    </div>
  )
}
