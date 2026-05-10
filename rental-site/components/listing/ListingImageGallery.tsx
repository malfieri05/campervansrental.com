'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import { ChevronLeft, ChevronRight, Share, X } from 'lucide-react'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800'

/** 15% shorter than legacy 16/7 at the same width (more listing detail above the fold). */
const LISTING_HERO_ASPECT_MAIN = 16 / (7 * 0.85)
/** 2-column hero tiles: 15% shorter than 4/3 at the same width. */
const LISTING_HERO_ASPECT_TILE_2UP = 4 / (3 * 0.85)

interface Props {
  images: string[]
  alt: string
  listingTitle?: string
  shareUrl?: string
}

// ─────────────────────────────────────────────
// Share helper
// ─────────────────────────────────────────────
async function doShare(title: string, url: string): Promise<'shared' | 'copied' | 'error'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'error'
  }
}

// ─────────────────────────────────────────────
// Fullscreen lightbox
// ─────────────────────────────────────────────
function Lightbox({
  images,
  startIndex,
  alt,
  onClose,
}: {
  images: string[]
  startIndex: number
  alt: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const closeRef = useRef<HTMLButtonElement>(null)
  const thumbRef = useRef<HTMLButtonElement | null>(null)
  const total = images.length

  const prev = useCallback(() => setIndex((i) => (i === 0 ? total - 1 : i - 1)), [total])
  const next = useCallback(() => setIndex((i) => (i === total - 1 ? 0 : i + 1)), [total])

  // Lock body scroll
  useLayoutEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  // Focus close on open
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Scroll active thumbnail into view
  useEffect(() => {
    thumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — photo gallery`}
      className="fixed inset-0 z-[200] flex flex-col bg-charcoal/95 backdrop-blur-sm"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <span className="font-sans text-sm text-cream-100/60 tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-cream-100/20 bg-white/10 text-cream-100 hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4">
        <div className="relative w-full h-full max-w-5xl mx-auto">
          <Image
            key={images[index]}
            src={images[index]}
            alt={`${alt} — photo ${index + 1}`}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 80vw"
            priority
          />
        </div>

        {/* Prev */}
        <button
          type="button"
          onClick={prev}
          disabled={total <= 1}
          className="absolute left-2 sm:left-6 flex h-11 w-11 items-center justify-center rounded-full border border-cream-100/20 bg-white/10 text-cream-100 shadow hover:bg-white/20 transition disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={next}
          disabled={total <= 1}
          className="absolute right-2 sm:right-6 flex h-11 w-11 items-center justify-center rounded-full border border-cream-100/20 bg-white/10 text-cream-100 shadow hover:bg-white/20 transition disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-thin">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              ref={i === index ? thumbRef : undefined}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === index}
              className={[
                'relative flex-shrink-0 w-16 h-11 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                i === index
                  ? 'border-gold-400 opacity-100 shadow-gold'
                  : 'border-transparent opacity-45 hover:opacity-75',
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
    </div>,
    document.body
  )
}

// ─────────────────────────────────────────────
// Hero 5-up grid
// ─────────────────────────────────────────────
function HeroGrid({
  images,
  alt,
  onOpen,
}: {
  images: string[]
  alt: string
  onOpen: (startIndex: number) => void
}) {
  const total = images.length
  const slots = [images[0], images[1], images[2], images[3], images[4]].map(
    (s) => s ?? null
  )

  const heroImg =
    'object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]'

  // Single image
  if (total === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="group relative w-full overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        style={{ aspectRatio: LISTING_HERO_ASPECT_MAIN }}
      >
        <Image src={slots[0]!} alt={alt} fill className={heroImg} sizes="88rem" priority />
      </button>
    )
  }

  // 2 images
  if (total === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            style={{ aspectRatio: LISTING_HERO_ASPECT_TILE_2UP }}
          >
            <Image src={slots[i]!} alt={`${alt} ${i + 1}`} fill className={heroImg} sizes="50vw" priority={i === 0} />
          </button>
        ))}
      </div>
    )
  }

  // 3 images: main on left, two stacked on right
  if (total === 3) {
    return (
      <div
        className="grid grid-cols-[1fr_1fr] grid-rows-[1fr_1fr] gap-1 rounded-2xl overflow-hidden"
        style={{ aspectRatio: LISTING_HERO_ASPECT_MAIN }}
      >
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="group row-span-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <Image src={slots[0]!} alt={alt} fill className={heroImg} sizes="50vw" priority />
        </button>
        {[1, 2].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <Image src={slots[i]!} alt={`${alt} ${i + 1}`} fill className={heroImg} sizes="25vw" />
          </button>
        ))}
      </div>
    )
  }

  // 4 images: main left + 3 right (top + 2 bottom)
  if (total === 4) {
    return (
      <div
        className="grid grid-cols-[1fr_1fr] grid-rows-[1fr_1fr] gap-1 rounded-2xl overflow-hidden"
        style={{ aspectRatio: LISTING_HERO_ASPECT_MAIN }}
      >
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="group row-span-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <Image src={slots[0]!} alt={alt} fill className={heroImg} sizes="50vw" priority />
        </button>
        <button type="button" onClick={() => onOpen(1)} className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
          <Image src={slots[1]!} alt={`${alt} 2`} fill className={heroImg} sizes="25vw" />
        </button>
        <div className="grid grid-cols-2 gap-1">
          {[2, 3].map((i) => (
            <button key={i} type="button" onClick={() => onOpen(i)} className="group relative aspect-square overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
              <Image src={slots[i]!} alt={`${alt} ${i + 1}`} fill className={heroImg} sizes="12vw" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 5+ images: large main left (50%) + 2×2 grid right
  return (
    <div
      className="grid grid-rows-[1fr_1fr] gap-1 rounded-2xl overflow-hidden"
      style={{ gridTemplateColumns: '1fr 1fr', aspectRatio: LISTING_HERO_ASPECT_MAIN }}
    >
      {/* Main — spans 2 rows */}
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="group row-span-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        aria-label={`${alt} — photo 1, open gallery`}
      >
        <Image
          src={slots[0]!}
          alt={alt}
          fill
          className={heroImg}
          sizes="(max-width: 768px) 100vw, 44vw"
          priority
        />
      </button>

      {/* Top-right row: photos 2 & 3 */}
      <div className="grid grid-cols-2 gap-1">
        {[1, 2].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            aria-label={`${alt} — photo ${i + 1}`}
          >
            <Image
              src={slots[i]!}
              alt={`${alt} — photo ${i + 1}`}
              fill
              className={heroImg}
              sizes="(max-width: 768px) 50vw, 22vw"
            />
          </button>
        ))}
      </div>

      {/* Bottom-right row: photos 4 & 5 (last has "View all" pill) */}
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onOpen(3)}
          className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label={`${alt} — photo 4`}
        >
          <Image
            src={slots[3]!}
            alt={`${alt} — photo 4`}
            fill
            className={heroImg}
            sizes="22vw"
          />
        </button>
        <button
          type="button"
          onClick={() => onOpen(4)}
          className="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label={`View all ${total} photos`}
        >
          <Image
            src={slots[4]!}
            alt={`${alt} — photo 5`}
            fill
            className={heroImg}
            sizes="22vw"
          />
          {/* "View all" pill — only if there are more than 5 */}
          {total > 5 && (
            <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 md:p-3">
              <span className="max-w-[78%] rounded-full bg-charcoal/75 px-2 py-1 text-center font-sans text-[0.625rem] font-semibold leading-snug text-cream-50 backdrop-blur-sm md:max-w-none md:px-3 md:py-1.5 md:text-left md:text-xs md:leading-normal">
                View all {total} photos
              </span>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────
export default function ListingImageGallery({
  images,
  alt,
  listingTitle,
  shareUrl,
}: Props) {
  const resolved = images.length === 0 ? [PLACEHOLDER] : images
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [shareConfirm, setShareConfirm] = useState<'copied' | 'shared' | null>(null)
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
    }
  }, [])

  const openLightbox = useCallback((i: number) => {
    setLightboxIndex(i)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  const handleShare = async () => {
    if (!shareUrl) return
    const result = await doShare(listingTitle ?? alt, shareUrl)
    if (result === 'copied' || result === 'shared') {
      setShareConfirm(result)
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
      shareTimerRef.current = setTimeout(() => setShareConfirm(null), 2500)
    }
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/fleet"
          className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 rounded"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          See all listings
        </Link>

        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 rounded px-2 py-1"
          aria-label="Share listing"
        >
          {shareConfirm === 'copied' ? (
            <span className="text-forest-700 text-xs">Link copied!</span>
          ) : shareConfirm === 'shared' ? (
            <span className="text-forest-700 text-xs">Shared!</span>
          ) : (
            <>
              <Share className="w-4 h-4" strokeWidth={2.5} />
              Share
            </>
          )}
        </button>
      </div>

      {/* ── 5-up grid ── */}
      <HeroGrid images={resolved} alt={alt} onOpen={openLightbox} />

      {/* ── Lightbox (portal) ── */}
      {mounted && lightboxOpen && (
        <Lightbox
          images={resolved}
          startIndex={lightboxIndex}
          alt={alt}
          onClose={closeLightbox}
        />
      )}
    </>
  )
}
