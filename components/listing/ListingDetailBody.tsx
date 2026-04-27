'use client'

import { useState } from 'react'
import { MapPin, Users, Ruler, Star, CheckCircle } from 'lucide-react'
import type { BlockRange } from '@/lib/availability'
import type { Van } from '@/types'
import { getCategoryLabel } from '@/lib/data'
import ListingCalendar from './ListingCalendar'
import ListingReservePanel from './ListingReservePanel'

interface Props {
  van: Van
  blocks: BlockRange[]
  pets: boolean
  smoking: boolean
}

export default function ListingDetailBody({ van, blocks, pets, smoking }: Props) {
  const [checkIn, setCheckIn] = useState<string | null>(null)
  const [checkOut, setCheckOut] = useState<string | null>(null)

  const handleDateClick = (key: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(key)
      setCheckOut(null)
      return
    }
    if (key <= checkIn) {
      setCheckIn(key)
      setCheckOut(null)
    } else {
      setCheckOut(key)
    }
  }

  const clearDates = () => {
    setCheckIn(null)
    setCheckOut(null)
  }

  const panelProps = { van, checkIn, checkOut, onClearDates: clearDates }

  return (
    <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

      {/* ── Left: scrollable content ──────────────────────── */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-10">

        {/* Title block */}
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-600 mb-2">
            {getCategoryLabel(van.category)}
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl font-semibold text-charcoal leading-tight mb-3">
            {van.name}
          </h1>
          <p className="font-sans text-lg text-charcoal/55 mb-5">{van.tagline}</p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-forest-800">
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-gold-500 flex-shrink-0" fill="#e0a82a" strokeWidth={0} />
              <span className="font-medium">{van.rating}</span>
              <span className="text-charcoal/45">({van.reviewCount} reviews)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 flex-shrink-0" />
              Sleeps {van.sleeps}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="w-4 h-4 flex-shrink-0" />
              {van.length}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {van.location}
            </span>
          </div>
        </div>

        {/* Mobile reserve panel — visible early on small screens */}
        <div className="lg:hidden">
          <ListingReservePanel {...panelProps} />
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-gold-400/30 via-gold-400/15 to-transparent" />

        {/* Description */}
        {van.description && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-3">About this van</h2>
            <p className="font-sans text-base text-charcoal/70 leading-relaxed">{van.description}</p>
          </div>
        )}

        {/* Features as pills */}
        {van.features.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-4">Features</h2>
            <div className="flex flex-wrap gap-2">
              {van.features.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 font-sans text-sm text-forest-800 bg-forest-50 border border-forest-200/60 px-3 py-1.5 rounded-full"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-forest-600 flex-shrink-0" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Amenities as pills */}
        {van.amenities.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-4">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {van.amenities.map((a) => (
                <span
                  key={a.label}
                  className="font-sans text-sm text-charcoal/70 bg-cream-100 border border-cream-300/60 px-3 py-1.5 rounded-full"
                >
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* House rules */}
        <div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal mb-4">House rules</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Pets', allowed: pets },
              { label: 'Smoking', allowed: smoking },
            ].map(({ label, allowed }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 bg-cream-50 border border-cream-300/50 rounded-xl px-4 py-3"
              >
                <span
                  className={[
                    'w-2 h-2 rounded-full flex-shrink-0',
                    allowed ? 'bg-forest-500' : 'bg-charcoal/25',
                  ].join(' ')}
                />
                <span className="font-sans text-sm text-charcoal/70">
                  {label}: {allowed ? 'Allowed' : 'Not allowed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Availability calendar */}
        <div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal mb-2">Availability</h2>
          <p className="font-sans text-sm text-charcoal/50 mb-4">
            {!checkIn
              ? 'Click a date to set your check-in, then click another for check-out.'
              : !checkOut
              ? 'Now select your check-out date.'
              : `${checkIn} → ${checkOut} selected. Adjust or continue to reserve.`}
          </p>
          <div className="bg-cream-50 border border-cream-300/50 rounded-2xl p-5 shadow-luxury-sm">
            <ListingCalendar
              blocks={blocks}
              readOnly={false}
              checkIn={checkIn}
              checkOut={checkOut}
              onDateClick={handleDateClick}
            />
          </div>
        </div>

      </div>

      {/* ── Right: sticky reserve panel (desktop) ─────────── */}
      <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
        <div className="sticky top-24">
          <ListingReservePanel {...panelProps} />
        </div>
      </div>

    </div>
  )
}
