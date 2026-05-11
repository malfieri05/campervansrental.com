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
} from 'lucide-react'
import RatingOrNewBadge from '@/components/ui/RatingOrNewBadge'
import type { BlockRange } from '@/lib/availability'
import { resolveListingDateClick } from '@/lib/listing-date-selection'
import type { Van } from '@/types'
import { vanPickupDisplay } from '@/lib/listing-public-pickup'
import {
  hasPickupProcedureSection,
  hostTripPickupTime,
  hostTripReturnTime,
  pickupProcedureDocUrl,
  pickupProcedureText,
} from '@/lib/listing-trip-guest'
import ListingCalendar from '@/components/listing/ListingCalendar'
import ReservationFeeLabelWithTooltip from '@/components/booking/ReservationFeeLabelWithTooltip'
import {
  reservationFeeCents,
  tripTotalCentsExcludingSecurityDeposit,
  reservationFeeRefundPolicyCopy,
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
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [priceBreakdownOpen, setPriceBreakdownOpen] = useState(false)

  const guests = Math.min(Math.max(initialGuests, 1), van.sleeps)

  const minNights = van.minNights ?? 1
  const nights =
    checkIn && checkOut
      ? differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
      : 0
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
  }, [checkIn, checkOut, van.id, initialGuests, van.sleeps])

  const checkoutHref = hasDates && van.listingUuid
    ? `/checkout?listing=${van.listingUuid}&start=${checkIn}&end=${checkOut}&guests=${guests}`
    : null

  const heroImage = van.images[0] ?? '/placeholder.jpg'
  const pickupTimeLabel = hostTripPickupTime(van)
  const returnTimeLabel = hostTripReturnTime(van)
  const procedureBody = pickupProcedureText(van)
  const procedureDoc = pickupProcedureDocUrl(van)
  const showProcedure = hasPickupProcedureSection(van)

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
                  <RatingOrNewBadge reviewCount={van.reviewCount} rating={van.rating} size="sm" />
                </div>
                <p className="font-sans text-xs text-charcoal/45 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {vanPickupDisplay(van)}
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
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 text-center">
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal/40 mb-0.5">Check-in</p>
                      <p className="font-sans text-sm font-medium text-charcoal">{fmt(checkIn)}</p>
                      {pickupTimeLabel ? (
                        <p className="mt-1 font-sans text-xs text-charcoal/45 leading-snug">
                          Pickup from {pickupTimeLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex-1 h-px bg-neutral-200 mt-5 shrink-0" />
                    <div className="min-w-0 flex-1 text-center">
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal/40 mb-0.5">Check-out</p>
                      <p className="font-sans text-sm font-medium text-charcoal">{fmt(checkOut)}</p>
                      {returnTimeLabel ? (
                        <p className="mt-1 font-sans text-xs text-charcoal/45 leading-snug">
                          Return by {returnTimeLabel}
                        </p>
                      ) : null}
                    </div>
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
                    minNights={minNights}
                  />
                </div>
              )}
            </div>

            {/* Location / pickup */}
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-4 shadow-luxury-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <MapPin className="w-4 h-4 text-charcoal/40" />
                <span className="font-sans text-sm font-medium text-charcoal">Pickup location</span>
              </div>
              <p className="font-sans text-sm text-charcoal/60">{vanPickupDisplay(van)}</p>
              <p className="font-sans text-xs text-charcoal/35 mt-1">Exact address provided after booking confirmation.</p>
              {showProcedure ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                    Pickup procedure
                  </p>
                  {procedureBody ? (
                    <p className="font-sans text-sm text-charcoal/70 leading-relaxed whitespace-pre-wrap">
                      {procedureBody}
                    </p>
                  ) : null}
                  {procedureDoc ? (
                    <a
                      href={procedureDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-sans text-sm font-medium text-forest-700 hover:text-forest-600 underline ${procedureBody ? 'mt-3 inline-block' : 'inline-block'}`}
                    >
                      View pickup & drop-off document
                    </a>
                  ) : null}
                </div>
              ) : null}
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
                      <span>${van.pricePerNight.toLocaleString()}</span>
                      <span>
                        × {nights} night{nights !== 1 ? 's' : ''}
                      </span>
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

                    <button
                      type="button"
                      onClick={() => setPriceBreakdownOpen((o) => !o)}
                      className="mt-2 flex w-full items-center gap-1.5 pl-3 text-left font-sans text-sm text-charcoal/55 hover:text-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/30 rounded-md py-0.5 -ml-0.5"
                      aria-expanded={priceBreakdownOpen}
                      aria-controls="request-price-breakdown"
                      id="request-price-breakdown-toggle"
                    >
                      <span
                        className={`inline-flex w-3 shrink-0 justify-center font-sans text-xs text-charcoal/40 transition-transform duration-200 ${priceBreakdownOpen ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        {'>'}
                      </span>
                      <span className="font-medium">Breakdown</span>
                    </button>

                    <div
                      id="request-price-breakdown"
                      role="region"
                      aria-labelledby="request-price-breakdown-toggle"
                      hidden={!priceBreakdownOpen}
                      className="border-t border-neutral-100 pt-3 space-y-2"
                    >
                      <p className="pl-2 font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">
                        Due today:
                      </p>
                      <div className="flex justify-between items-start gap-3 pl-5 font-sans text-sm text-forest-800">
                        <ReservationFeeLabelWithTooltip cancellationPolicy={van.cancellationPolicy} />
                        <span className="shrink-0 tabular-nums">
                          $
                          {(reservationFeeC / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
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
                          <div className="flex justify-between pl-5 font-sans text-sm text-charcoal italic">
                            <span>Security deposit</span>
                            <span className="shrink-0 tabular-nums">${securityDepositDollars.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <p className="font-sans text-[0.7rem] text-charcoal/35">
                        Remaining balance and security deposit are collected at pickup.
                      </p>
                    </div>
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
                  {reservationFeeRefundPolicyCopy(van.cancellationPolicy)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
