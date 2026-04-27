'use client'

import Link from 'next/link'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Van } from '@/types'

interface Props {
  van: Van
  checkIn?: string | null
  checkOut?: string | null
  onClearDates?: () => void
}

function fmt(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy')
}

export default function ListingReservePanel({ van, checkIn, checkOut, onClearDates }: Props) {
  const cleaningFee = van.cleaningFeeCents ? van.cleaningFeeCents / 100 : null
  const insuranceFee = van.insuranceFeeCents ? van.insuranceFeeCents / 100 : null

  const nights =
    checkIn && checkOut ? differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)) : 0
  const nightsTotal = nights * van.pricePerNight
  const insuranceTotal = insuranceFee && nights ? insuranceFee * nights : null
  const grandTotal = nightsTotal + (cleaningFee ?? 0) + (insuranceTotal ?? 0)
  const hasDates = nights > 0

  const bookingHref = hasDates
    ? `/booking?listing=${encodeURIComponent(van.id)}&checkIn=${checkIn}&checkOut=${checkOut}`
    : `/booking?listing=${encodeURIComponent(van.id)}`

  return (
    <div className="bg-cream-50 border border-cream-300/50 rounded-2xl shadow-luxury-sm overflow-hidden">
      {/* Price header */}
      <div className="px-6 pt-6 pb-4 border-b border-cream-300/40">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-3xl font-semibold text-gold-600">
            ${van.pricePerNight.toLocaleString()}
          </span>
          <span className="font-sans text-sm text-charcoal/45">/ night</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-gold-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-sans text-xs text-charcoal/60">
            {van.rating} · {van.reviewCount} review{van.reviewCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Date selection display */}
      <div className="px-6 py-4 border-b border-cream-300/40">
        {hasDates ? (
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-forest-700 mb-0.5">
                    Selected dates
                  </p>
                  <p className="font-sans text-sm text-charcoal font-medium">
                    {fmt(checkIn!)} → {fmt(checkOut!)}
                  </p>
                  <p className="font-sans text-xs text-charcoal/50 mt-0.5">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {onClearDates && (
                <button
                  type="button"
                  onClick={onClearDates}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-charcoal/40 hover:text-charcoal hover:bg-cream-200 transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Clear dates"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-charcoal/45">
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans text-sm">
              {checkIn ? 'Select a check-out date' : 'Select dates on the calendar'}
            </span>
          </div>
        )}
      </div>

      {/* Fee breakdown — only when dates are selected */}
      {hasDates && (
        <div className="px-6 py-4 space-y-2 border-b border-cream-300/40">
          <div className="flex justify-between font-sans text-sm text-charcoal/70">
            <span>${van.pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span>${nightsTotal.toLocaleString()}</span>
          </div>
          {cleaningFee !== null && (
            <div className="flex justify-between font-sans text-sm text-charcoal/70">
              <span>Cleaning fee</span>
              <span>${cleaningFee.toLocaleString()}</span>
            </div>
          )}
          {insuranceTotal !== null && (
            <div className="flex justify-between font-sans text-sm text-charcoal/70">
              <span>Protection plan ({nights}d)</span>
              <span>${insuranceTotal.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-sans text-sm font-semibold text-charcoal border-t border-cream-300/50 pt-2 mt-1">
            <span>Total</span>
            <span>${grandTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 py-5 space-y-3">
        <Button
          href={bookingHref}
          variant="primary"
          size="lg"
          fullWidth
        >
          {hasDates ? 'Reserve trip' : 'Check availability'}
        </Button>

        <p className="font-sans text-center text-[0.7rem] text-charcoal/40">
          You won&apos;t be charged yet
        </p>

        <Link
          href="/fleet"
          className="block text-center font-display text-[0.7rem] font-bold uppercase tracking-widest text-forest-700 hover:text-gold-500 transition-colors duration-200 mt-1"
        >
          ← Back to fleet
        </Link>
      </div>
    </div>
  )
}
