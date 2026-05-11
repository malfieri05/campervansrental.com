'use client'

import { useEffect, useState } from 'react'
import { MapPin, Users, Ruler, CheckCircle, FileText } from 'lucide-react'
import RatingOrNewBadge from '@/components/ui/RatingOrNewBadge'
import type { BlockRange } from '@/lib/availability'
import { resolveListingDateClick } from '@/lib/listing-date-selection'
import type { Van } from '@/types'
import { getCategoryLabel, formatVanLengthFt } from '@/lib/data'
import { vanPickupDisplay } from '@/lib/listing-public-pickup'
import ListingReservePanel from './ListingReservePanel'
import ListingInlineChat from './ListingInlineChat'

interface Props {
  van: Van
  blocks: BlockRange[]
  pets: boolean
  smoking: boolean
}

export default function ListingDetailBody({ van, blocks, pets, smoking }: Props) {
  const [checkIn, setCheckIn] = useState<string | null>(null)
  const [checkOut, setCheckOut] = useState<string | null>(null)

  // Fire view increment on mount
  useEffect(() => {
    void fetch(`/api/listings/${van.id}/view`, { method: 'POST' }).catch(() => {})
  }, [van.id])

  const handleDateClick = (key: string) => {
    const next = resolveListingDateClick({
      key,
      checkIn,
      checkOut,
      blocks,
      minNights: van.minNights ?? 1,
    })
    if (!next) return
    setCheckIn(next.checkIn)
    setCheckOut(next.checkOut)
  }

  const clearDates = () => {
    setCheckIn(null)
    setCheckOut(null)
  }

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
              <RatingOrNewBadge reviewCount={van.reviewCount} rating={van.rating} size="md" />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 flex-shrink-0" />
              Sleeps {van.sleeps}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="w-4 h-4 flex-shrink-0" />
              {formatVanLengthFt(van.length) ?? van.length}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {vanPickupDisplay(van)}
            </span>
          </div>
        </div>

        {/* Mobile reserve panel */}
        <div className="lg:hidden">
          <ListingReservePanel
            van={van}
            blocks={blocks}
            checkIn={checkIn}
            checkOut={checkOut}
            onDateClick={handleDateClick}
            onClearDates={clearDates}
          />
        </div>

        <div className="h-px bg-gradient-to-r from-gold-400/30 via-gold-400/15 to-transparent" />

        {/* Description */}
        {van.description && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-3">About this van</h2>
            <p className="font-sans text-base text-charcoal/70 leading-relaxed">{van.description}</p>
          </div>
        )}

        {/* Features */}
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

        {/* Amenities */}
        {van.amenities.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-4">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {van.amenities.map((a) => (
                <span
                  key={a.label}
                  className="font-sans text-sm text-blue-700 bg-cream-100 border border-blue-400 px-3 py-1.5 rounded-full"
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
                    allowed ? 'bg-green-500' : 'bg-red-500',
                  ].join(' ')}
                />
                <span className="font-sans text-sm text-charcoal/70">
                  {label}: {allowed ? 'Allowed' : 'Not allowed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inline chatbot (optional, host-toggled) */}
        {van.listingChatbotEnabled && (
          <ListingInlineChat slug={van.id} />
        )}

        {/* Pick-up & drop-off (optional host content) */}
        {(van.pickupDropoffRulesText?.trim() || van.pickupDropoffRulesDocUrl?.trim()) && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-4">
              Pick-up &amp; drop-off
            </h2>
            {van.pickupDropoffRulesDocUrl?.trim() && (
              <a
                href={van.pickupDropoffRulesDocUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gold-400/40 bg-cream-50 px-4 py-3 text-sm font-medium text-gold-800 hover:bg-cream-100"
              >
                <FileText className="h-4 w-4 shrink-0 text-gold-600" />
                View pickup &amp; drop-off document
              </a>
            )}
            {van.pickupDropoffRulesText?.trim() && (
              <p className="font-sans text-base text-charcoal/70 leading-relaxed whitespace-pre-wrap">
                {van.pickupDropoffRulesText.trim()}
              </p>
            )}
          </div>
        )}

      </div>

      {/* ── Right: sticky reserve panel (desktop) ─────────── */}
      <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
        <div className="sticky top-24">
          <ListingReservePanel
            van={van}
            blocks={blocks}
            checkIn={checkIn}
            checkOut={checkOut}
            onDateClick={handleDateClick}
            onClearDates={clearDates}
          />
        </div>
      </div>

    </div>
  )
}
