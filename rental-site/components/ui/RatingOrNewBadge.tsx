import { Star } from 'lucide-react'

interface Props {
  reviewCount: number
  /** Numeric average 1–5; ignored when reviewCount === 0. */
  rating: number
  /** Controls text + icon sizing. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: {
    star: 'w-3 h-3',
    text: 'text-xs',
    badge: 'text-[0.6rem] px-2 py-0.5',
  },
  md: {
    star: 'w-3.5 h-3.5',
    text: 'text-sm',
    badge: 'text-[0.65rem] px-2.5 py-1',
  },
  lg: {
    star: 'w-4 h-4',
    text: 'text-base',
    badge: 'text-xs px-3 py-1',
  },
}

/**
 * Shows star + numeric rating when reviewCount > 0, otherwise a "NEW!" capsule.
 * “New!” capsule uses bright green so it reads as fresh / unrated, distinct from gold accents.
 */
export default function RatingOrNewBadge({ reviewCount, rating, size = 'md' }: Props) {
  const s = sizeMap[size]

  if (reviewCount === 0) {
    return (
      <span
        className={[
          'inline-flex items-center font-display font-bold uppercase tracking-[0.15em] text-green-600',
          'rounded-full border border-green-500/70 bg-green-500/15',
          s.badge,
        ].join(' ')}
      >
        New!
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Star className={`${s.star} text-gold-500 shrink-0`} fill="#e0a82a" strokeWidth={0} />
      <span className={`${s.text} font-semibold text-charcoal`}>{rating.toFixed(1)}</span>
      <span className={`${s.text} text-charcoal/50`}>
        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  )
}
