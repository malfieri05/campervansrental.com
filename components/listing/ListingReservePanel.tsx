'use client'

import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { CalendarDays, ChevronDown, ChevronRight, Flame, MapPin, Package, X } from 'lucide-react'
import type { BlockRange } from '@/lib/availability'
import { siteUrl } from '@/lib/env'
import type { Van } from '@/types'
import ListingCalendar from './ListingCalendar'

const REPORT_EMAIL = 'support@campervansrental.com'

function reportListingMailtoHref(van: Van): string {
  const listingUrl = `${siteUrl()}/listings/${encodeURIComponent(van.id)}`
  const subject = `Listing report: ${van.name}`
  const body = [
    `I'm contacting you about the following listing:`,
    '',
    `Listing: ${van.name}`,
    `URL: ${listingUrl}`,
    '',
    'Please describe the issue:',
    '',
    '',
  ].join('\n')
  const params = new URLSearchParams({
    subject,
    body,
  })
  return `mailto:${REPORT_EMAIL}?${params.toString()}`
}

interface Props {
  van: Van
  blocks: BlockRange[]
  checkIn: string | null
  checkOut: string | null
  onDateClick: (key: string) => void
  onClearDates: () => void
}

function fmt(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy')
}

/** Deterministic placeholder view count so it looks real even offline. */
function placeholderViews(vanId: string) {
  let hash = 0
  for (let i = 0; i < vanId.length; i++) hash = (hash * 31 + vanId.charCodeAt(i)) | 0
  return 80 + (Math.abs(hash) % 160)
}

export default function ListingReservePanel({
  van,
  blocks,
  checkIn,
  checkOut,
  onDateClick,
  onClearDates,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [pickupOpen, setPickupOpen] = useState(false)
  const [addOnsOpen, setAddOnsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevCheckOutRef = useRef<string | null>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const minNights = van.minNights ?? 1
  const viewCount = van.viewCount ?? placeholderViews(van.id)
  const nights =
    checkIn && checkOut ? differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)) : 0
  const nightsTotal = nights * van.pricePerNight
  const grandTotal = nightsTotal
  const hasDates = nights >= minNights
  const hasPartialDates = Boolean(checkIn && !checkOut)
  const minNightsViolation = Boolean(checkIn && checkOut && nights < minNights)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!calendarOpen || !triggerRef.current) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const pad = 12
      const maxW = Math.min(720, window.innerWidth - pad * 2)
      let left = rect.left + rect.width / 2 - maxW / 2
      left = Math.max(pad, Math.min(left, window.innerWidth - maxW - pad))
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width: maxW,
        zIndex: 100,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [calendarOpen])

  useEffect(() => {
    if (!calendarOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setCalendarOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalendarOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [calendarOpen])

  useEffect(() => {
    const before = prevCheckOutRef.current
    prevCheckOutRef.current = checkOut
    if (calendarOpen && checkIn && checkOut && before === null) {
      const id = window.setTimeout(() => setCalendarOpen(false), 200)
      return () => clearTimeout(id)
    }
  }, [checkIn, checkOut, calendarOpen])

  const handleDateClick = (key: string) => {
    onDateClick(key)
  }

  const reviewHref = hasDates
    ? `/listings/${van.id}/request?start=${checkIn}&end=${checkOut}&guests=2`
    : null

  const dateLabel = checkIn && checkOut
    ? `${fmt(checkIn)} → ${fmt(checkOut)}`
    : checkIn
    ? `${fmt(checkIn)} → Select check-out`
    : 'Select your dates'

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-luxury-sm overflow-visible">

      {/* ── Price + social proof ──────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-3xl font-bold text-charcoal">
            ${van.pricePerNight.toLocaleString()}
          </span>
          <span className="font-sans text-sm text-charcoal/45">/night</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Flame className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
          <span className="font-sans text-xs text-charcoal/60">
            Popular choice! Viewed {viewCount} times this month
          </span>
        </div>
      </div>

      {/* ── Dates section ────────────────────────────── */}
      <div className="px-6 py-4 border-b border-neutral-100 relative">
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/50 mb-2">
          Dates
        </p>

        {/* Date trigger row */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          className={[
            'w-full flex items-center justify-between gap-3 border rounded-xl px-4 py-3.5 text-left transition-all duration-200',
            calendarOpen
              ? 'border-forest-600 ring-2 ring-forest-600/20 bg-forest-50/30'
              : 'border-neutral-200 bg-white hover:border-neutral-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarDays className="w-4 h-4 text-charcoal/40 flex-shrink-0" />
            <span
              className={[
                'font-sans text-sm truncate',
                checkIn ? 'text-charcoal font-medium' : 'text-charcoal',
              ].join(' ')}
            >
              {dateLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {(checkIn || checkOut) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearDates()
                  setCalendarOpen(false)
                }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-charcoal/30 hover:text-charcoal hover:bg-neutral-100 transition-colors"
                aria-label="Clear dates"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown
              className={[
                'w-4 h-4 text-charcoal/40 transition-transform duration-200',
                calendarOpen ? 'rotate-180' : '',
              ].join(' ')}
            />
          </div>
        </button>

        {/* Calendar overlay (portal — not clipped by sidebar width) */}
        {mounted &&
          calendarOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[90] cursor-default bg-charcoal/15 backdrop-blur-[1px]"
                aria-hidden
                onClick={() => setCalendarOpen(false)}
              />
              <div
                ref={panelRef}
                style={panelStyle}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-luxury max-h-[min(85vh,900px)] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-label="Choose trip dates"
              >
                {minNights > 1 && (
                  <p className="font-sans text-xs text-charcoal/60 mb-3 px-1">
                    This rental has a {minNights} night minimum.
                  </p>
                )}
                <ListingCalendar
                  blocks={blocks}
                  readOnly={false}
                  layout="overlay"
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onDateClick={handleDateClick}
                />
              </div>
            </>,
            document.body
          )}

        {/* Validation feedback */}
        {minNightsViolation && (
          <p className="mt-2 font-sans text-xs text-gold-600">
            Minimum stay is {minNights} night{minNights !== 1 ? 's' : ''}. Please select a later check-out date.
          </p>
        )}
        {hasPartialDates && !calendarOpen && (
          <p className="mt-2 font-sans text-xs text-charcoal/50">Now select your check-out date.</p>
        )}
      </div>

      {/* ── Getting the RV (collapsible) ─────────────── */}
      <div className="border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setPickupOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-neutral-50/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-charcoal/40 flex-shrink-0" />
            <span className="font-sans text-sm text-charcoal/50 font-medium">Getting the RV</span>
          </div>
          <ChevronRight
            className={[
              'w-4 h-4 text-charcoal/30 transition-transform duration-200',
              pickupOpen ? 'rotate-90' : '',
            ].join(' ')}
          />
        </button>
        {pickupOpen && (
          <div className="px-6 pb-4 font-sans text-sm text-charcoal/60 leading-relaxed space-y-1">
            <p className="font-medium text-charcoal">Pick-up location</p>
            <p>{van.location}</p>
            <p className="text-xs text-charcoal/45 pt-1">
              Exact address and instructions provided after booking is confirmed.
            </p>
          </div>
        )}
      </div>

      {/* ── Add-ons (collapsible) ─────────────────────── */}
      <div className="border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setAddOnsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-neutral-50/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4 text-charcoal/40 flex-shrink-0" />
            <span className="font-sans text-sm text-charcoal/50 font-medium">Add-ons</span>
          </div>
          <ChevronRight
            className={[
              'w-4 h-4 text-charcoal/30 transition-transform duration-200',
              addOnsOpen ? 'rotate-90' : '',
            ].join(' ')}
          />
        </button>
        {addOnsOpen && (
          <div className="px-6 pb-4 font-sans text-sm text-charcoal/60">
            <p>Optional extras (camping gear, welcome kit, etc.) can be arranged after booking confirmation. Contact the host to customise your trip.</p>
          </div>
        )}
      </div>

      {/* ── Fee breakdown (when dates selected) ───────── */}
      {hasDates && (
        <div className="px-6 py-4 border-b border-neutral-100 space-y-2">
          <div className="flex justify-between font-sans text-sm text-charcoal/70">
            <span>${van.pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span>${nightsTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-sans text-sm text-charcoal/70">
            <span>Fees</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between font-sans text-sm font-semibold text-charcoal border-t border-neutral-100 pt-2 mt-1">
            <span>Trip total</span>
            <span>${grandTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ── CTA ───────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-3">
        {hasDates && reviewHref ? (
          <a
            href={reviewHref}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-400 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-gold transition hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
          >
            Review request
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-400 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-gold transition hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
          >
            Check availability
          </button>
        )}

        <p className="font-sans text-center text-[0.7rem] text-charcoal/40">
          You won&apos;t be charged yet
        </p>

        <a
          href={reportListingMailtoHref(van)}
          className="block text-center font-sans text-[0.7rem] text-charcoal/35 hover:text-charcoal/55 transition-colors"
        >
          Report this listing
        </a>
      </div>
    </div>
  )
}
