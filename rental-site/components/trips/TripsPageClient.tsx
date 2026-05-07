'use client'

import { useState, useMemo, useId, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  ChevronDown,
  MapPin,
  Users,
  CalendarRange,
  FileText,
  ArrowUpRight,
  Tent,
  Clock,
} from 'lucide-react'
import {
  format,
  parseISO,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TripItem = {
  id: string
  start_date: string
  end_date: string
  guests: number
  status: string
  nights: number
  // Financials — intentionally kept separate, shown last
  subtotal_cents: number
  fees_cents: number
  total_cents: number
  deposit_cents: number
  pickup_location: string | null
  // Listing info
  listing_title: string
  listing_slug: string
  listing_category: string
  listing_location: string | null
  listing_image: string | null
  listing_vehicle_year: string | null
  listing_vehicle_make: string | null
  listing_vehicle_model: string | null
  // Agreement
  has_signed_agreement: boolean
  /** Stripe Checkout session for returning to the booking success / paperwork flow */
  stripe_checkout_session_id: string | null
}

type Tab = 'upcoming' | 'previous'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return iso
  }
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function nightsLabel(n: number) {
  return `${n} night${n !== 1 ? 's' : ''}`
}

function guestsLabel(n: number) {
  return `${n} guest${n !== 1 ? 's' : ''}`
}

function categoryLabel(c: string) {
  const map: Record<string, string> = {
    classic: 'Classic',
    adventure: 'Adventure',
    luxury: 'Luxury',
    'ultra-luxury': 'Ultra Luxury',
  }
  return map[c] ?? c
}

function vehicleLabel(year: string | null, make: string | null, model: string | null) {
  return [year, make, model].filter(Boolean).join(' ') || null
}

type BadgeStyle = { bg: string; text: string; label: string }

function statusBadge(status: string): BadgeStyle {
  switch (status) {
    case 'confirmed':
      return { bg: 'bg-forest-100 border border-forest-300/60', text: 'text-forest-700', label: 'Confirmed' }
    case 'pending_payment':
      return { bg: 'bg-amber-50 border border-amber-200/60', text: 'text-amber-700', label: 'Pending payment' }
    case 'pending_host':
      return {
        bg: 'bg-amber-50 border border-amber-200/60',
        text: 'text-amber-800',
        label: 'Awaiting host confirmation',
      }
    case 'cancelled':
      return { bg: 'bg-red-50 border border-red-200/60', text: 'text-red-600', label: 'Cancelled' }
    default:
      return { bg: 'bg-cream-200/70 border border-cream-300/60', text: 'text-charcoal/60', label: status }
  }
}

// ─── Calendar (single-column, read-only, trip-range aware) ───────────────────

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

type TripRange = { start: string; end: string; status: string }

function TripCalendar({
  trips,
  selectedTrip,
}: {
  trips: TripItem[]
  selectedTrip: TripItem | null
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  const tripRanges: TripRange[] = useMemo(
    () =>
      trips.map((t) => ({
        start: t.start_date,
        end: t.end_date,
        status: t.status,
      })),
    [trips]
  )

  useEffect(() => {
    if (selectedTrip) {
      setCursor(startOfMonth(parseISO(selectedTrip.start_date)))
      return
    }
    setCursor(startOfMonth(new Date()))
  }, [selectedTrip])

  function renderMonth(monthStart: Date, showNav: boolean) {
    const gridStart = startOfWeek(startOfMonth(monthStart))
    const gridEnd = endOfWeek(endOfMonth(monthStart))
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          {showNav ? (
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Previous month"
              className="w-8 h-8 rounded-lg border border-cream-300/70 bg-cream-100/80 text-charcoal hover:bg-cream-200/70 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 shrink-0" aria-hidden />
          )}
          <span className="font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-forest-800">
            {format(monthStart, 'MMMM')}
          </span>
          {showNav ? (
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
              className="w-8 h-8 rounded-lg border border-cream-300/70 bg-cream-100/80 text-charcoal hover:bg-cream-200/70 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 shrink-0" aria-hidden />
          )}
        </div>
        <div className="grid grid-cols-7 mb-1 text-center">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="font-display text-[0.55rem] uppercase tracking-wide text-charcoal/35 py-0.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const key = dayKey(d)
            const inMonth = isSameMonth(d, monthStart)
            let tripStyle: string | null = null
            for (const r of tripRanges) {
              const start = r.start
              const end = r.end
              if (key >= start && key <= end) {
                const isSelectedRange =
                  selectedTrip &&
                  r.start === selectedTrip.start_date &&
                  r.end === selectedTrip.end_date &&
                  r.status === selectedTrip.status

                const pendingTrip = r.status === 'pending_payment' || r.status === 'pending_host'
                if (isSelectedRange) {
                  if (r.status === 'cancelled') {
                    tripStyle =
                      key === r.start || key === r.end
                        ? 'bg-cream-400/70 text-charcoal/40 line-through font-bold'
                        : 'bg-cream-200/50 text-charcoal/35 line-through rounded-none'
                  } else if (pendingTrip) {
                    tripStyle =
                      key === r.start || key === r.end
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-100 text-amber-950 rounded-none'
                  } else {
                    tripStyle =
                      key === r.start || key === r.end
                        ? 'bg-forest-700 text-cream-50 font-bold'
                        : 'bg-forest-100 text-forest-900 rounded-none'
                  }
                } else if (r.status === 'cancelled') {
                  tripStyle = 'bg-cream-300/60 text-charcoal/30 line-through'
                } else if (pendingTrip) {
                  tripStyle =
                    key === start || key === end
                      ? 'bg-amber-500 text-white font-bold'
                      : 'bg-amber-50 text-amber-900 rounded-none'
                } else if (key === start || key === end) {
                  tripStyle = 'bg-gold-400 text-forest-950 font-bold shadow-gold'
                } else {
                  tripStyle = 'bg-gold-100/90 text-charcoal rounded-none'
                }
                break
              }
            }

            return (
              <div
                key={key}
                title={tripStyle ? undefined : undefined}
                className={[
                  'min-h-[2.1rem] rounded-md text-xs font-sans flex items-center justify-center transition-colors',
                  inMonth ? '' : 'opacity-30',
                  tripStyle
                    ? tripStyle
                    : 'bg-cream-100/80 border border-cream-200/40 text-charcoal',
                ].join(' ')}
              >
                {format(d, 'd')}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative min-h-[1.75rem]">
        <button
          type="button"
          onClick={() => setCursor(startOfMonth(new Date()))}
          className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full border border-gold-400/70 min-w-[4.6rem] px-3 py-1.5 font-display text-[0.62rem] font-bold uppercase leading-none tracking-[0.12em] text-gold-500 hover:bg-gold-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
        >
          Today
        </button>
        <p className="text-center font-display text-[0.94rem] font-bold uppercase tracking-[0.16em] text-forest-800">
          {format(cursor, 'yyyy')}
        </p>
      </div>
      {renderMonth(cursor, true)}
      <div className="border-t border-cream-300/60 mx-1" />
      {renderMonth(addMonths(cursor, 1), false)}
      <div className="px-1 pt-2 space-y-2">
        <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal/35 font-semibold">Legend</p>
        <div className="flex flex-col gap-1.5 font-sans text-xs text-charcoal/55">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gold-400 inline-block shrink-0" />
            Trip start / end
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gold-100/90 border border-gold-200 inline-block shrink-0" />
            Trip days
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-cream-300/60 inline-block shrink-0" />
            Cancelled
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Expandable trip card ─────────────────────────────────────────────────────

function TripCard({
  trip,
  open,
  onToggle,
  selected,
}: {
  trip: TripItem
  open: boolean
  onToggle: () => void
  selected: boolean
}) {
  const headingId = useId()
  const panelId = useId()
  const badge = statusBadge(trip.status)
  const vehicle = vehicleLabel(trip.listing_vehicle_year, trip.listing_vehicle_make, trip.listing_vehicle_model)

  return (
    <div
      className={[
        'rounded-2xl border bg-cream-50 shadow-luxury-sm transition-shadow duration-200',
        selected
          ? 'border-forest-500 shadow-luxury ring-1 ring-forest-200'
          : open
            ? 'border-charcoal/15 shadow-luxury'
            : 'border-cream-300/60 hover:border-charcoal/10',
      ].join(' ')}
    >
      {/* ── Collapsed header ── */}
      <button
        type="button"
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 rounded-2xl"
      >
        <div className="flex items-center gap-4 p-4 sm:p-5">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-cream-200/60 shrink-0">
            {trip.listing_image ? (
              <Image
                src={trip.listing_image}
                alt={trip.listing_title}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tent className="w-6 h-6 text-charcoal/30" />
              </div>
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-base sm:text-lg font-semibold text-charcoal leading-tight truncate">
                  {trip.listing_title}
                </h3>
                {vehicle && (
                  <p className="font-sans text-xs text-charcoal/50 mt-0.5 truncate">{vehicle}</p>
                )}
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-display font-semibold uppercase tracking-wide ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 font-sans text-xs text-charcoal/60">
              <span className="flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                {fmtDate(trip.start_date)} – {fmtDate(trip.end_date)}
              </span>
              <span className="text-charcoal/30">·</span>
              <span>{nightsLabel(trip.nights)}</span>
              <span className="text-charcoal/30">·</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                {guestsLabel(trip.guests)}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="shrink-0 text-charcoal/35"
            aria-hidden
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </button>

      {/* ── Expanded body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-1 space-y-5 border-t border-charcoal/8">

              {/* Location + pickup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {trip.listing_location && (
                  <div>
                    <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1">Location</p>
                    <p className="flex items-start gap-1.5 font-sans text-sm text-charcoal/75">
                      <MapPin className="w-4 h-4 text-charcoal/45 mt-0.5 shrink-0" />
                      {trip.listing_location}
                    </p>
                  </div>
                )}
                {trip.pickup_location && (
                  <div>
                    <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1">Pickup address</p>
                    <p className="flex items-start gap-1.5 font-sans text-sm text-charcoal/75">
                      <MapPin className="w-4 h-4 text-charcoal/45 mt-0.5 shrink-0" />
                      {trip.pickup_location}
                    </p>
                  </div>
                )}
              </div>

              {/* Vehicle + category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicle && (
                  <div>
                    <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1">Vehicle</p>
                    <p className="font-sans text-sm text-charcoal/75">{vehicle}</p>
                  </div>
                )}
                <div>
                  <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1">Category</p>
                  <p className="font-sans text-sm text-charcoal/75">{categoryLabel(trip.listing_category)}</p>
                </div>
              </div>

              {/* Dates detail */}
              <div>
                <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1">Trip dates</p>
                <p className="font-sans text-sm text-charcoal/75">
                  {fmtDate(trip.start_date)} → {fmtDate(trip.end_date)} &nbsp;·&nbsp; {nightsLabel(trip.nights)} &nbsp;·&nbsp; {guestsLabel(trip.guests)}
                </p>
              </div>

              {/* Status — pending note */}
              {trip.status === 'pending_payment' && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="font-sans text-sm text-amber-800">
                    Your payment is being processed. Check your email for a confirmation once it clears.
                  </p>
                </div>
              )}
              {trip.status === 'pending_host' && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="font-sans text-sm text-amber-800">
                    Payment received — the host is reviewing your dates. Watch your inbox: you&apos;ll receive a confirmation email once they approve your trip. Rental paperwork opens after confirmation.
                  </p>
                </div>
              )}

              {/* Agreement */}
              <div>
                <p className="font-display text-[0.6rem] uppercase tracking-widest text-charcoal font-semibold mb-1.5">Documents</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm text-charcoal">
                  <FileText className="w-4 h-4 shrink-0 text-charcoal" aria-hidden />
                  <span className="font-medium">Rental agreement:</span>
                  {trip.has_signed_agreement ? (
                    <span className="font-medium text-emerald-700">Completed</span>
                  ) : trip.stripe_checkout_session_id ? (
                    <Link
                      href={`/booking/success?session_id=${encodeURIComponent(trip.stripe_checkout_session_id)}&openAgreement=1`}
                      aria-label="Complete rental agreement and paperwork for this trip"
                      className="font-medium text-red-600 underline underline-offset-2 decoration-red-600 hover:text-red-700 hover:decoration-red-700 transition-colors"
                    >
                      Not yet completed
                    </Link>
                  ) : (
                    <span
                      className="font-medium text-red-600 underline underline-offset-2 decoration-red-600"
                      title="Checkout session not on file — use the link from your confirmation email or contact support."
                    >
                      Not yet completed
                    </span>
                  )}
                </div>
              </div>

              {/* View listing link */}
              <div>
                <Link
                  href={`/listings/${trip.listing_slug}`}
                  className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-charcoal/65 underline underline-offset-[5px] decoration-charcoal/30 hover:text-charcoal hover:decoration-charcoal/60 transition-colors"
                >
                  View listing
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* ── Pricing — visually de-emphasized, at the bottom ── */}
              <div className="border-t border-charcoal/8 pt-4 mt-2">
                <p className="font-display text-[0.55rem] uppercase tracking-widest text-charcoal font-semibold mb-2">Pricing</p>
                <div className="font-sans text-xs text-charcoal/45 space-y-1">
                  <div className="flex justify-between">
                    <span>Rental subtotal</span>
                    <span>{money(trip.subtotal_cents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees</span>
                    <span>{money(trip.fees_cents)}</span>
                  </div>
                  <div className="flex justify-between border-t border-charcoal/8 pt-1 mt-1">
                    <span>Trip total</span>
                    <span>{money(trip.total_cents)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal/35">
                    <span>Reservation fee paid</span>
                    <span>{money(trip.deposit_cents)}</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab toggle ───────────────────────────────────────────────────────────────

function TripTabs({
  active,
  onChange,
  upcomingCount,
  previousCount,
}: {
  active: Tab
  onChange: (t: Tab) => void
  upcomingCount: number
  previousCount: number
}) {
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { id: 'previous', label: 'Previous', count: previousCount },
  ]

  return (
    <LayoutGroup id="trip-tabs">
      <div className="flex gap-1 rounded-xl border border-cream-300/60 bg-cream-50 p-1 w-fit shadow-luxury-sm">
        {tabs.map((tab) => {
          const active2 = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active2}
              onClick={() => onChange(tab.id)}
              className={[
                'relative rounded-lg px-5 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60',
                active2 ? 'text-forest-950' : 'text-charcoal/55 hover:text-charcoal',
              ].join(' ')}
            >
              {active2 && (
                <motion.span
                  layoutId="trip-tab-pill"
                  className="absolute inset-0 z-0 rounded-lg bg-gold-400 shadow-gold"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative z-10">{`${tab.label} (${tab.count})`}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-2xl border border-cream-300/60 bg-cream-50 px-8 py-16 text-center shadow-luxury-sm">
      <div className="w-12 h-12 rounded-full bg-cream-200/70 flex items-center justify-center mx-auto mb-4">
        <Tent className="w-5 h-5 text-charcoal/30" />
      </div>
      {tab === 'upcoming' ? (
        <>
          <p className="font-serif text-lg font-semibold text-charcoal mb-1">No upcoming trips</p>
          <p className="font-sans text-sm text-charcoal/50 mb-6">Ready for an adventure? Browse available campervans.</p>
          <Link
            href="/fleet"
            className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-forest-950 shadow-gold hover:bg-gold-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            Browse vans
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </>
      ) : (
        <>
          <p className="font-serif text-lg font-semibold text-charcoal mb-1">No previous trips</p>
          <p className="font-sans text-sm text-charcoal/50">Your past trips will appear here once completed.</p>
        </>
      )}
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export default function TripsPageClient({
  upcoming,
  previous,
}: {
  upcoming: TripItem[]
  previous: TripItem[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [activeTripId, setActiveTripId] = useState<string | null>(null)
  const visibleTrips = activeTab === 'upcoming' ? upcoming : previous
  const allTrips = useMemo(() => [...upcoming, ...previous], [upcoming, previous])
  const selectedTrip = useMemo(
    () => allTrips.find((t) => t.id === activeTripId) ?? null,
    [allTrips, activeTripId]
  )

  useEffect(() => {
    if (!activeTripId) return
    const stillVisible = visibleTrips.some((t) => t.id === activeTripId)
    if (!stillVisible) setActiveTripId(null)
  }, [activeTab, visibleTrips, activeTripId])

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-24 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-7">
          <h1 className="font-serif text-3xl font-semibold text-charcoal">My Trips</h1>
          <p className="font-sans text-sm text-charcoal/55 mt-1">
            Your travel history and upcoming adventures.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Left: Trip feed (2/3) ── */}
          <section
            className="w-full lg:w-2/3"
            aria-label="Trip list"
          >
            <div className="mb-5">
              <TripTabs
                active={activeTab}
                onChange={setActiveTab}
                upcomingCount={upcoming.length}
                previousCount={previous.length}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                role="tabpanel"
                aria-label={activeTab === 'upcoming' ? 'Upcoming trips' : 'Previous trips'}
              >
                {visibleTrips.length === 0 ? (
                  <EmptyState tab={activeTab} />
                ) : (
                  <ul className="space-y-4">
                    {visibleTrips.map((trip) => (
                      <li key={trip.id}>
                        <TripCard
                          trip={trip}
                          open={activeTripId === trip.id}
                          selected={activeTripId === trip.id}
                          onToggle={() =>
                            setActiveTripId((prev) => (prev === trip.id ? null : trip.id))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          {/* ── Right: Calendar (1/3) ── */}
          <aside
            className="w-full lg:w-1/3 lg:sticky lg:top-28"
            aria-label="Trip calendar"
          >
            <p className="text-center font-serif text-xl font-semibold text-charcoal mb-3">
              Your Schedule
            </p>
            <div className="rounded-2xl border border-cream-300/60 bg-cream-50 p-4 sm:p-5 shadow-luxury-sm">
              <TripCalendar trips={allTrips} selectedTrip={selectedTrip} />
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}
