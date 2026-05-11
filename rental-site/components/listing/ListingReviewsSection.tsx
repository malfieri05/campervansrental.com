'use client'

import { useEffect, useId, useState } from 'react'
import { Star, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ListingReview } from '@/lib/listing-reviews'

interface Props {
  reviews: ListingReview[]
  /** Average rating 1–5 for the filled stars bar. */
  avgRating: number
}

function StarRow({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5 shrink-0"
          fill={i < n ? '#e0a82a' : 'none'}
          stroke={i < n ? '#e0a82a' : '#d1bc8a'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function ReviewCard({ review }: { review: ListingReview }) {
  const authorLabel = review.author_name ?? 'Verified guest'
  let dateLabel = ''
  try {
    dateLabel = format(parseISO(review.created_at), 'MMMM yyyy')
  } catch {
    dateLabel = ''
  }

  return (
    <div className="rounded-xl border border-cream-300/60 bg-cream-50 px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-sans text-sm font-semibold text-charcoal">{authorLabel}</p>
          {dateLabel && (
            <p className="font-sans text-xs text-charcoal/40 mt-0.5">{dateLabel}</p>
          )}
        </div>
        <StarRow n={review.rating} />
      </div>
      {review.body?.trim() && (
        <p className="font-sans text-sm text-charcoal/75 leading-relaxed whitespace-pre-wrap">
          {review.body.trim()}
        </p>
      )}
    </div>
  )
}

export default function ListingReviewsSection({ reviews, avgRating }: Props) {
  const count = reviews.length
  const panelId = useId()
  const headingId = useId()
  const [open, setOpen] = useState(count > 0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#reviews') {
      setOpen(true)
      requestAnimationFrame(() => {
        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  return (
    <div id="reviews">
      <button
        type="button"
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-sm py-1 text-left transition-colors hover:bg-cream-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <h2 className="font-serif text-2xl font-semibold text-charcoal">Guest reviews</h2>
          <ChevronDown
            className={['h-5 w-5 shrink-0 text-charcoal/40 transition-transform duration-200', open ? 'rotate-180' : ''].join(
              ' '
            )}
            aria-hidden
          />
        </span>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 shrink-0 text-gold-500" fill="#e0a82a" strokeWidth={0} />
            <span className="font-sans text-sm font-semibold text-charcoal">{avgRating.toFixed(1)}</span>
            <span className="font-sans text-sm text-charcoal/50">
              · {count} {count === 1 ? 'review' : 'reviews'}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} role="region" aria-labelledby={headingId} className="mt-5">
          {count === 0 ? (
            <div className="flex flex-wrap items-start gap-3">
              <span
                className={[
                  'inline-flex shrink-0 items-center font-display font-bold uppercase tracking-[0.15em] text-green-600',
                  'rounded-full border border-green-500/70 bg-green-500/15',
                  'text-[0.65rem] px-2.5 py-1',
                ].join(' ')}
              >
                New Listing!
              </span>
              <p className="min-w-0 flex-1 font-sans text-sm text-charcoal/50 leading-relaxed">
                No reviews yet — be one of the first guests to share your experience.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
