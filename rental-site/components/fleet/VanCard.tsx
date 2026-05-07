'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Van } from '@/types'
import { getCategoryLabel, formatVanLengthFt } from '@/lib/data'

interface VanCardProps {
  van: Van
}

const CARD_IMAGE_MAX = 5
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800'

export default function VanCard({ van }: VanCardProps) {
  const raw = van.images?.length ? van.images : []
  const cardImages = raw.length === 0 ? [PLACEHOLDER_IMG] : raw.slice(0, CARD_IMAGE_MAX)

  const [index, setIndex] = useState(0)
  const n = cardImages.length
  const safeIndex = n ? ((index % n) + n) % n : 0
  const src = cardImages[safeIndex] ?? PLACEHOLDER_IMG

  const listingHref = `/listings/${van.id}`

  const go = useCallback(
    (delta: number, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (n <= 1) return
      setIndex((i) => (i + delta + n) % n)
    },
    [n]
  )

  const specs = [
    getCategoryLabel(van.category),
    van.sleeps ? `Sleeps ${van.sleeps}` : null,
    formatVanLengthFt(van.length),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={[
        'group/card flex flex-col bg-white rounded-2xl overflow-hidden cursor-pointer',
        'border border-neutral-200/90 shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-gold-400/45 hover:shadow-lg hover:shadow-black/[0.08]',
        'hover:ring-2 hover:ring-gold-400/25 hover:ring-offset-2 hover:ring-offset-cream-100',
        'focus-within:ring-2 focus-within:ring-forest-600 focus-within:ring-offset-2 focus-within:ring-offset-cream-100',
      ].join(' ')}
    >
      {/* Image block */}
      <div className="relative h-52 sm:h-56 shrink-0 overflow-hidden rounded-t-2xl">
        <Image
          src={src}
          alt={`${van.name} — photo ${safeIndex + 1} of ${n}`}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />

        {/* Invisible overlay link */}
        <Link
          href={listingHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-500"
          aria-label={`View ${van.name}`}
        />

        {/* Arrows */}
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => go(-1, e)}
              className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-charcoal shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => go(1, e)}
              className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-charcoal shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Dots */}
        {n > 1 && (
          <div
            className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-1 pointer-events-none"
            aria-hidden
          >
            {cardImages.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === safeIndex ? 'bg-white' : 'bg-white/45',
                ].join(' ')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <Link
        href={listingHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col gap-0.5 px-4 py-3.5 focus-visible:outline-none rounded-b-2xl"
      >
        <h3 className="font-sans text-[0.9rem] font-semibold text-charcoal leading-snug line-clamp-2 transition-colors group-hover/card:text-forest-800">
          {van.name}
        </h3>
        <p className="font-sans text-xs text-charcoal/55 mt-0.5 line-clamp-1">{specs}</p>
        <p className="font-sans text-xs text-charcoal/50">{van.location}</p>

        {/* Price + rating */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 transition-colors group-hover/card:border-gold-400/25">
          <div>
            <span className="font-sans text-base font-bold text-charcoal transition-colors group-hover/card:text-gold-600">
              ${van.pricePerNight.toLocaleString()}
            </span>
            <span className="font-sans text-xs text-charcoal/50 ml-0.5">/night</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-gold-500 shrink-0" fill="#c4861a" strokeWidth={0} />
            <span className="font-sans text-xs font-semibold text-charcoal">
              {van.rating}
            </span>
            <span className="font-sans text-xs text-charcoal/45">({van.reviewCount})</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
