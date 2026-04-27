'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt: string
}

export default function ListingImageGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0)
  const total = images.length

  const prev = () => setActive((i) => (i === 0 ? total - 1 : i - 1))
  const next = () => setActive((i) => (i === total - 1 ? 0 : i + 1))

  return (
    <div className="w-full">
      {/* Main image */}
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-forest-950 shadow-luxury mb-3">
        <Image
          key={images[active]}
          src={images[active]}
          alt={`${alt} — photo ${active + 1}`}
          fill
          priority
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 1024px) 100vw, 60vw"
        />

        {/* Prev / Next arrows — only shown when >1 image */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-forest-950/60 hover:bg-forest-950/90 backdrop-blur-sm flex items-center justify-center text-cream-100 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-forest-950/60 hover:bg-forest-950/90 backdrop-blur-sm flex items-center justify-center text-cream-100 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot counter */}
            <div className="absolute bottom-3 right-4 bg-forest-950/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-cream-100/80 font-sans text-xs">
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — hidden if only one image */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={`Photo ${i + 1}`}
              className={[
                'relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                i === active
                  ? 'border-gold-400 shadow-gold opacity-100'
                  : 'border-transparent opacity-55 hover:opacity-85',
              ].join(' ')}
            >
              <Image
                src={src}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
