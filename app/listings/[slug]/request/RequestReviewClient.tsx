'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  Pencil,
  Star,
  Users,
  X,
} from 'lucide-react'
import type { BlockRange } from '@/lib/availability'
import { resolveListingDateClick } from '@/lib/listing-date-selection'
import type { Van } from '@/types'
import ListingCalendar from '@/components/listing/ListingCalendar'
import ReservationFeeLabelWithTooltip from '@/components/booking/ReservationFeeLabelWithTooltip'
import {
  reservationFeeCents,
  tripTotalCentsExcludingSecurityDeposit,
  RESERVATION_FEE_REFUND_COPY,
} from '@/lib/booking-pricing'

interface Props {
  van: Van
  blocks: BlockRange[]
  initialStart: string | null
  initialEnd: string | null
  initialGuests: number
}

function fmt(iso: string) {
  return format(parseISO(iso), 'EEE, MMM d')
}

export default function RequestReviewClient({
  van,
  blocks,
  initialStart,
  initialEnd,
  initialGuests,
}: Props) {
  const [checkIn, setCheckIn] = useState<string | null>(initialStart)
  const [checkOut, setCheckOut] = useState<string | null>(initialEnd)
  const [guests, setGuests] = useState(initialGuests)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const minNights = van.minNights ?? 1
  const nights =
    checkIn && checkOut
      ? differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
      : 0
  const nightsTotal = nights * van.pricePerNight
  const tripTotalCents =
    nights >= minNights && nights > 0
      ? tripTotalCentsExcludingSecurityDeposit({
          pricePerNightCents: Math.round(van.pricePerNight * 100),
          nights,
        })
      : 0
  const reservationFeeC = reservationFeeCents(tripTotalCents)
  const remainingTripCents = Math.max(0, tripTotalCents - reservationFeeC)
  const securityDepositDollars = van.securityDepositCents
    ? van.securityDepositCents / 100
    : null
  const hasDates = nights >= minNights
  const minNightsViolation = Boolean(checkIn && checkOut && nights > 0 && nights < minNights)

  const handleDateClick = useCallback(
    (key: string) => {
      const next = resolveListingDateClick({
        key,
        checkIn,
        checkOut,
        blocks,
        minNights,
      })
      if (!next) return
      setCheckIn(next.checkIn)
      setCheckOut(next.checkOut)
      if (next.checkOut) {
        setTimeout(() => setCalendarOpen(false), 200)
      }
    },
    [checkIn, checkOut, minNights, blocks]
  )

  // Update URL params when dates change so back-navigation restores state
  useEffect(() => {
    const params = new URLSearchParams()
    if (checkIn) params.set('start', checkIn)
    if (checkOut) params.set('end', checkOut)
    params.set('guests', String(guests))
    const url = `/listings/${van.id}/request?${params.toString()}`
    window.history.replaceState(null, '', url)
  }, [checkIn, checkOut, guests, van.id])

  const checkoutHref = hasDates && van.listingUuid
    ? `/checkout?listing=${van.listingUuid}&start=${checkIn}&end=${checkOut}&guests=${guests}`
    : null

  const heroImage = van.images[0] ?? '/placeholder.jpg'

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href={`/listings/${van.id}`}
          className="inline-flex items-center gap-1.5 font-sans text-sm text-charcoal/50 hover:text-charcoal transition-colors mb-8"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
          Back to listing
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-8">
          Review your request
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

          {/* ── Left: trip details ───────────────────────── */}
          <div className="space-y-5">

            {/* Van summary card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 flex gap-4 shadow-luxury-sm">
              <div className="relative w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-cream-200">
                <Image
                  src={heroImage}
                  alt={van.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-gold-600 mb-0.5">
                  {van.category}
                </p>
                <p className="font-serif text-lg font-semibold text-charcoal leading-tight truncate">
                  {van.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" fill="#e0a82a" strokeWidth={0} />
                  <span className="font-sans text-xs text-charcoal/60">
                    {van.rating} ({van.reviewCount})
                  </span>
                </div>
                <p className="font-sans text-xs text-charcoal/45 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {van.location}
                </p>
              </div>
            </div>

            {/* Dates row (editable) */}
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-luxury-sm overflow-visible">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-charcoal/40" />
                  <span className="font-sans text-sm font-medium text-charcoal">Dates</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((o) => !o)}
                  className="flex items-center gap-1 font-sans text-xs text-forest-700 hover:text-forest-600 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <div className="px-5 py-4">
                {checkIn && checkOut ? (
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal/40 mb-0.5">Check-in</p>
                      <p className="font-sans text-sm font-medium text-charcoal">{fmt(checkIn)}</p>
                    </div>
                    <div className="flex-1 h-px bg-neutral-200" />
                    <div className="text-center">
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal/40 mb-0.5">Check-out</p>
                      <p className="font-sans text-sm font-medium text-charcoal">{fmt(checkOut)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCheckIn(null); setCheckOut(null) }}
                      className="ml-2 w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-charcoal/40 hover:text-charcoal transition-colors"
                      aria-label="Clear dates"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(true)}
                    className="flex items-center gap-2 font-sans text-sm text-charcoal/40 hover:text-charcoal transition-colors"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Select your dates
                  </button>
                )}

                {minNightsViolation && (
                  <p className="mt-2 font-sans text-xs text-gold-600">
                    Minimum stay is {minNights} night{minNights !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>

              {/* Inline calendar */}
              {calendarOpen && (
                <div className="border-t border-neutral-100 p-4 sm:p-5">
                  {minNights > 1 && (
                    <p className="font-sans text-xs text-charcoal/50 mb-3">
                      This rental has a {minNights} night minimum.
                    </p>
                  )}
                  <ListingCalendar
                    blocks={blocks}
                    readOnly={false}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onDateClick={handleDateClick}
                  />
                </div>
              )}
            </div>

            {/* Guests row */}
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-4 flex items-center justify-between shadow-luxury-sm">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-charcoal/40" />
                <span className="font-sans text-sm font-medium text-charcoal">Guests</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center font-sans text-base text-charcoal/60 hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease guests"
                >
                  –
                </button>
                <span className="font-sans text-sm font-semibold text-charcoal w-4 text-center">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.min(van.sleeps, g + 1))}
                  className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center font-sans text-base text-charcoal/60 hover:bg-neutral-50 transition-colors"
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
            </div>

            {/* Location / pickup */}
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-4 shadow-luxury-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <MapPin className="w-4 h-4 text-charcoal/40" />
                <span className="font-sans text-sm font-medium text-charcoal">Pickup location</span>
              </div>
              <p className="font-sans text-sm text-charcoal/60">{van.location}</p>
              <p className="font-sans text-xs text-charcoal/35 mt-1">Exact address provided after booking confirmation.</p>
            </div>

          </div>

          {/* ── Right: sticky total + CTA ──────────────── */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-luxury-sm overflow-visible">

              {/* Pricing breakdown */}
              <div className="px-6 py-5 border-b border-neutral-100 space-y-2.5">
                <p className="font-display text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                  Price summary
                </p>
                {hasDates ? (
                  <>
                    <div className="flex justify-between font-sans text-sm text-charcoal/70">
                      <span>${van.pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span>${nightsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-sans text-sm text-charcoal/70">
                      <span>Fees</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-sans text-sm font-semibold text-charcoal border-t border-neutral-100 pt-2.5 mt-1">
                      <span>Trip total</span>
                      <span>
                        $
                        {(tripTotalCents / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="border-t border-neutral-100 pt-3 space-y-2">
                      <p className="pl-2 font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">
                        Due today:
                      </p>
                      <div className="flex justify-between items-start gap-3 pl-5 font-sans text-sm text-forest-800">
                        <ReservationFeeLabelWithTooltip />
                        <span className="shrink-0 tabular-nums">
                          $
                          {(reservationFeeC / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <p className="pl-2 font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">
                        Due at pickup:
                      </p>
                      <div className="flex justify-between pl-5 font-sans text-sm text-forest-800">
                        <span>Remaining trip balance</span>
                        <span className="shrink-0 tabular-nums">
                          $
                          {(remainingTripCents / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {securityDepositDollars !== null && (
                        <div className="flex justify-between pl-5 font-sans text-sm text-forest-800">
                          <span>Vehicle security deposit</span>
                          <span className="shrink-0 tabular-nums">${securityDepositDollars.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <p className="font-sans text-[0.7rem] text-charcoal/35">
                      Remaining balance and security deposit are collected at pickup.
                    </p>
                  </>
                ) : (
                  <p className="font-sans text-sm text-charcoal/40">
                    Select dates to see pricing.
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="px-6 py-5 space-y-3">
                {checkoutHref ? (
                  <Link
                    href={checkoutHref}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-400 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-gold transition hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                  >
                    Continue to payment
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-200 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-neutral-400 cursor-not-allowed"
                  >
                    Continue to payment
                  </button>
                )}

                <p className="font-sans text-center text-[0.7rem] text-charcoal/45">
                  Next step: pay the reservation fee only — not the full trip total.
                </p>

                <p className="font-sans text-center text-[0.65rem] text-charcoal/35 leading-snug px-1">
                  {RESERVATION_FEE_REFUND_COPY}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
