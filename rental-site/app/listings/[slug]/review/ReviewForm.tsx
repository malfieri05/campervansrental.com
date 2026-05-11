'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { submitReview } from './actions'
import Button from '@/components/ui/Button'
import { reviewDeadlineLabel } from '@/lib/listing-reviews'

interface Props {
  slug: string
  reservationId: string
  vanName: string
  tripEndDate: string
}

export default function ReviewForm({ slug, reservationId, vanName, tripEndDate }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedRating, setSelectedRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedRating === 0) {
      setError('Please select a star rating.')
      return
    }

    startTransition(async () => {
      const result = await submitReview(slug, reservationId, selectedRating, body)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSubmitted(true)
      // Brief pause so the user sees the success message, then navigate back.
      setTimeout(() => router.push(`/listings/${slug}#reviews`), 1800)
    })
  }

  const deadline = reviewDeadlineLabel(tripEndDate)

  if (submitted) {
    return (
      <div className="text-center py-10 px-4">
        <p className="font-serif text-2xl font-semibold text-charcoal mb-2">Thank you!</p>
        <p className="font-sans text-sm text-charcoal/55">
          Your review has been posted. Returning to the listing…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-charcoal mb-1">
          Review your trip
        </h1>
        <p className="font-sans text-sm text-charcoal/55">{vanName}</p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
          {error}
        </p>
      )}

      {/* Star rating */}
      <div>
        <label className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-3">
          Overall rating <span className="text-red-500">*</span>
        </label>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Star rating"
          onMouseLeave={() => setHoveredStar(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= (hoveredStar || selectedRating)
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selectedRating === n}
                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                onMouseEnter={() => setHoveredStar(n)}
                onClick={() => setSelectedRating(n)}
                className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 rounded"
              >
                <Star
                  className="w-8 h-8"
                  fill={filled ? '#e0a82a' : 'none'}
                  stroke={filled ? '#e0a82a' : '#c9b896'}
                  strokeWidth={1.5}
                />
              </button>
            )
          })}
        </div>
        {selectedRating > 0 && (
          <p className="mt-1.5 font-sans text-xs text-charcoal/40">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selectedRating]}
          </p>
        )}
      </div>

      {/* Body */}
      <div>
        <label
          htmlFor="review-body"
          className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2"
        >
          Your experience <span className="font-normal text-charcoal/40 normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Share what you loved about this van and trip…"
          className="w-full bg-cream-100 border border-cream-300 text-charcoal text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-forest-500 resize-none font-sans"
        />
        <p className="text-right font-sans text-xs text-charcoal/35 mt-1">
          {body.length}/2000
        </p>
      </div>

      <Button type="submit" variant="primary" size="md" fullWidth disabled={isPending}>
        {isPending ? 'Submitting…' : 'Post review'}
      </Button>

      {deadline && (
        <p className="font-sans text-[0.7rem] text-charcoal/35 text-center">
          Reviews can be submitted for 48 hours after your trip ends (by {deadline}).
        </p>
      )}
    </form>
  )
}
