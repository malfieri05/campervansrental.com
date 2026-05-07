'use client'

import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  format,
  parseISO,
  isBefore,
  isAfter,
  max,
  min,
  differenceInDays,
} from 'date-fns'
import type { CalendarReservation, BlockRow, ExternalFeed } from '@/app/host/calendar/page'
import type { TripStatusFilter } from './HostCalendarSidebar'
import { getFeedColorTheme } from '@/lib/calendar-feed-colors'

const MONTHS_SHOWN = 6

type Props = {
  blocks: BlockRow[]
  reservations: CalendarReservation[]
  /** Linked iCal feeds — one distinct color + label per feed */
  feeds: ExternalFeed[]
  filters: TripStatusFilter
  pricePerNight: number | null
  onReservationClick: (id: string) => void
  /** yyyy-MM-dd — opens Update availability for that calendar day */
  onDayClick: (isoDate: string) => void
}

type StatusCategory = 'pending' | 'confirmed_upcoming' | 'currently_hosting' | 'completed'

function categorize(r: CalendarReservation): StatusCategory {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseISO(r.start_date)
  const end = parseISO(r.end_date)
  if (r.status === 'pending_payment' || r.status === 'pending_host' || r.status === 'pending') return 'pending'
  if (r.status === 'confirmed') {
    if (isBefore(end, today)) return 'completed'
    if (!isAfter(start, today) && isBefore(today, end)) return 'currently_hosting'
    return 'confirmed_upcoming'
  }
  return 'completed'
}

// Outdoorsy-style: soft colored backgrounds with a left-border accent
const BAR_STYLES: Record<StatusCategory, string> = {
  pending:            'bg-amber-50 border-l-2 border-amber-400 text-amber-800',
  confirmed_upcoming: 'bg-emerald-50 border-l-2 border-emerald-500 text-emerald-800',
  currently_hosting:  'bg-blue-50 border-l-2 border-blue-500 text-blue-800',
  completed:          'bg-neutral-100 border-l-2 border-neutral-400 text-neutral-500',
}

const STATUS_LABELS: Record<StatusCategory, string> = {
  pending:            'Pending',
  confirmed_upcoming: 'Approved',
  currently_hosting:  'Hosting',
  completed:          'Completed',
}

function getMonthWeeks(monthStart: Date): Date[][] {
  const start = startOfWeek(monthStart, { weekStartsOn: 0 })
  const end = endOfMonth(monthStart)
  const weeks: Date[][] = []
  let cursor = start
  while (!isAfter(cursor, end) || weeks.length < 1) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) { week.push(cursor); cursor = addDays(cursor, 1) }
    weeks.push(week)
    if (isAfter(cursor, end) && weeks.length > 0) break
  }
  return weeks
}

function reservationSpanInWeek(
  weekDays: Date[],
  resStart: Date,
  resEnd: Date
): { colStart: number; colEnd: number } | null {
  const weekStart = weekDays[0]
  const weekEnd = addDays(weekDays[6], 1)
  const clampedStart = max([resStart, weekStart])
  const clampedEnd = min([resEnd, weekEnd])
  if (!isBefore(clampedStart, clampedEnd)) return null
  return {
    colStart: differenceInDays(clampedStart, weekStart),
    colEnd: differenceInDays(clampedEnd, weekStart),
  }
}

/** Half-open interval [rangeStart, rangeEndExclusive) in date space — matches ICS / availability_blocks from sync */
function externalIntervalSpanInWeek(
  weekDays: Date[],
  rangeStart: Date,
  rangeEndExclusive: Date
): { colStart: number; colEnd: number } | null {
  const weekStart = weekDays[0]
  const weekAfterLast = addDays(weekDays[6], 1)
  const clampedFirst = max([rangeStart, weekStart])
  const clampedEndExclusive = min([rangeEndExclusive, weekAfterLast])
  if (!isBefore(clampedFirst, clampedEndExclusive)) return null
  return {
    colStart: differenceInDays(clampedFirst, weekStart),
    colEnd: differenceInDays(clampedEndExclusive, weekStart),
  }
}

function formatNightlyRate(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Half-open column intervals [colStart, colEnd) overlap if they share any day column in the week row */
function columnIntervalsOverlap(a: { colStart: number; colEnd: number }, b: { colStart: number; colEnd: number }) {
  return a.colStart < b.colEnd && b.colStart < a.colEnd
}

const BAR_TOP_OFFSET_PX = 34
const BAR_HEIGHT_PX = 26
const BAR_GAP_PX = 4
/** Always reserve vertical room for two stacked bars (even when a day has only one) */
const MIN_STACK_DEPTH = 2
/** Space below the bar stack for nightly rate + cell padding */
const FOOTER_BELOW_BARS_PX = 36

/**
 * Greedy lane assignment: overlapping horizontal bars get distinct vertical lanes (0, 1, 2, …).
 * Sort by start column, then longer spans first, to keep lane count low.
 */
function assignStackLanes<T extends { colStart: number; colEnd: number }>(items: T[]): number[] {
  const n = items.length
  const lanes = new Array<number>(n).fill(0)
  if (n === 0) return lanes

  const order = items.map((_, i) => i).sort((i, j) => {
    const a = items[i]
    const b = items[j]
    if (a.colStart !== b.colStart) return a.colStart - b.colStart
    return (b.colEnd - b.colStart) - (a.colEnd - a.colStart)
  })

  type Placed = { lane: number; colStart: number; colEnd: number }
  const placed: Placed[] = []

  for (const i of order) {
    const bar = items[i]
    let lane = 0
    while (placed.some((p) => p.lane === lane && columnIntervalsOverlap(p, bar))) {
      lane++
    }
    lanes[i] = lane
    placed.push({ lane, colStart: bar.colStart, colEnd: bar.colEnd })
  }

  return lanes
}

function rowMinHeightPx(maxLaneIndex: number) {
  const depth = Math.max(MIN_STACK_DEPTH, maxLaneIndex + 1)
  return BAR_TOP_OFFSET_PX + depth * BAR_HEIGHT_PX + (depth - 1) * BAR_GAP_PX + FOOTER_BELOW_BARS_PX
}

function guestLabel(first: string | null, last: string | null) {
  const parts: string[] = []
  if (first) parts.push(first)
  if (last) parts.push(last.charAt(0) + '.')
  return parts.join(' ')
}

export default function HostScheduleGrid({
  blocks,
  reservations,
  feeds,
  filters,
  pricePerNight,
  onReservationClick,
  onDayClick,
}: Props) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const months = useMemo(() =>
    Array.from({ length: MONTHS_SHOWN }, (_, i) => startOfMonth(addMonths(today, i)))
  , [today])

  /** Host manual blocks only — external_sync is shown as booking bars (same as platform reservations) */
  const blockedDates = useMemo(() => {
    const set = new Set<string>()
    for (const b of blocks) {
      if (b.block_type === 'host_blocked') {
        let cur = parseISO(b.start_date)
        const end = parseISO(b.end_date)
        while (isBefore(cur, end)) {
          set.add(format(cur, 'yyyy-MM-dd'))
          cur = addDays(cur, 1)
        }
      }
    }
    return set
  }, [blocks])

  const feedBarStyle = useMemo(() => {
    const m = new Map<string, { label: string; barClass: string }>()
    feeds.forEach((f, i) => {
      const name = f.display_name?.trim() || 'External'
      const theme = getFeedColorTheme(i)
      m.set(f.id, {
        label: `Booked - ${name}`,
        barClass: theme.barClass,
      })
    })
    return m
  }, [feeds])

  const visibleReservations = useMemo(() =>
    reservations
      .map((r) => ({ ...r, category: categorize(r) }))
      .filter((r) => filters[r.category])
  , [reservations, filters])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
      {months.map((monthStart) => {
        const weeks = getMonthWeeks(monthStart)

        return (
          <section key={monthStart.toISOString()} className="border-b border-neutral-200 last:border-b-0">
            {/* One sticky block (title + weekday row) so scrolling week rows / bars never paint over it */}
            <div className="sticky top-0 z-40 isolate border-b border-neutral-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="px-6 py-3.5">
                <h2 className="text-base font-bold text-neutral-800">
                  {format(monthStart, 'MMMM yyyy')}
                </h2>
              </div>
              <div className="grid grid-cols-7 border-t border-neutral-100">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div
                    key={i}
                    className="bg-white py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-r border-neutral-100 last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Week rows */}
            {weeks.map((weekDays, wi) => {
              // Compute reservation bar spans for this week
              const bars = visibleReservations.flatMap((r) => {
                const resStart = parseISO(r.start_date)
                const resEnd = parseISO(r.end_date)
                const span = reservationSpanInWeek(weekDays, resStart, resEnd)
                if (!span) return []
                const isStart = format(resStart, 'yyyy-MM-dd') === format(max([resStart, weekDays[0]]), 'yyyy-MM-dd') &&
                  resStart >= weekDays[0]
                return [{ ...r, ...span, isStart }]
              })

              const externalBars = blocks.flatMap((b, idx) => {
                if (b.block_type !== 'external_sync') return []
                const calId = b.external_calendar_id ?? null
                const rangeStart = parseISO(b.start_date)
                const rangeEndExclusive = parseISO(b.end_date)
                const span = externalIntervalSpanInWeek(weekDays, rangeStart, rangeEndExclusive)
                if (!span) return []
                const meta = calId ? feedBarStyle.get(calId) : undefined
                const label = meta?.label ?? 'Booked - External'
                const barClass = meta?.barClass ?? getFeedColorTheme(0).barClass
                const isStart =
                  format(rangeStart, 'yyyy-MM-dd') === format(max([rangeStart, weekDays[0]]), 'yyyy-MM-dd') &&
                  rangeStart >= weekDays[0]
                return [{ key: `ext-${b.start_date}-${b.end_date}-${calId ?? 'na'}-${idx}`, label, barClass, ...span, isStart }]
              })

              const stackItems = [
                ...bars.map((bar) => ({ colStart: bar.colStart, colEnd: bar.colEnd })),
                ...externalBars.map((bar) => ({ colStart: bar.colStart, colEnd: bar.colEnd })),
              ]
              const stackLanes = assignStackLanes(stackItems)
              const resLanes = stackLanes.slice(0, bars.length)
              const extLanes = stackLanes.slice(bars.length)
              const maxLaneThisWeek = stackLanes.length ? Math.max(...stackLanes) : 0
              const weekRowMinH = rowMinHeightPx(maxLaneThisWeek)

              return (
                <div
                  key={wi}
                  className="relative z-0 grid grid-cols-7 border-b border-neutral-100 last:border-b-0"
                  style={{ minHeight: weekRowMinH }}
                >
                  {/* Date cells */}
                  {weekDays.map((day, di) => {
                    const isCurrentMonth = isSameMonth(day, monthStart)
                    const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const isBlocked = blockedDates.has(dateStr)

                    const hoverTint = !isCurrentMonth
                      ? 'hover:bg-neutral-200/50'
                      : isBlocked
                        ? 'hover:bg-red-50/70'
                        : 'hover:bg-neutral-100'

                    return (
                      <button
                        key={di}
                        type="button"
                        onClick={() => onDayClick(dateStr)}
                        style={{ minHeight: weekRowMinH }}
                        className={[
                          'relative flex flex-col border-r border-neutral-100 px-2 pt-2 pb-1.5 text-left outline-none ring-inset transition-colors duration-150 last:border-r-0 focus-visible:ring-2 focus-visible:ring-gold-400/70',
                          hoverTint,
                          !isCurrentMonth ? 'cursor-pointer bg-neutral-50' : isBlocked ? 'cursor-pointer bg-red-50/40' : 'cursor-pointer bg-white',
                        ].join(' ')}
                        aria-label={`Update availability starting ${format(day, 'MMMM d, yyyy')}`}
                      >
                        {/* Day number */}
                        <span
                          className={[
                            'pointer-events-none font-semibold flex items-center justify-center rounded-full shrink-0',
                            isToday
                              ? 'text-xs w-6 h-6 bg-gold-400 text-white ring-1 ring-gold-600/35'
                              : [
                                  'text-sm w-7 h-7',
                                  !isCurrentMonth
                                    ? 'text-neutral-300'
                                    : isBlocked
                                      ? 'text-red-400'
                                      : 'text-neutral-700',
                                ].join(' '),
                          ].join(' ')}
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Spacer to push price down */}
                        <div className="pointer-events-none flex-1 min-h-[8px]" />

                        {/* Nightly rate — bottom of cell */}
                        {isCurrentMonth && pricePerNight != null && (
                          <span className="pointer-events-none text-[11px] text-neutral-400 self-end font-medium">
                            {formatNightlyRate(pricePerNight)}
                          </span>
                        )}
                      </button>
                    )
                  })}

                  {/* Reservation bars — absolute overlay inside the week row */}
                  {bars.map((bar, bi) => {
                    const lane = resLanes[bi] ?? 0
                    const topPx = BAR_TOP_OFFSET_PX + lane * (BAR_HEIGHT_PX + BAR_GAP_PX)
                    const label = bar.guest_first_name
                      ? `${guestLabel(bar.guest_first_name, bar.guest_last_name)}  ${STATUS_LABELS[bar.category as StatusCategory]}`
                      : STATUS_LABELS[bar.category as StatusCategory]

                    return (
                      <button
                        key={`${bar.id}-${bi}`}
                        type="button"
                        onClick={() => onReservationClick(bar.id)}
                        className={[
                          'absolute z-20 cursor-pointer text-left focus:outline-none',
                          BAR_STYLES[bar.category as StatusCategory],
                          'rounded-r-sm hover:brightness-95 transition-all',
                          bar.isStart ? 'rounded-l-sm' : '',
                        ].join(' ')}
                        style={{
                          top: topPx,
                          height: BAR_HEIGHT_PX,
                          left: `calc(${(bar.colStart / 7) * 100}% + 1px)`,
                          width: `calc(${((bar.colEnd - bar.colStart) / 7) * 100}% - 2px)`,
                        }}
                      >
                        <span className="flex items-center h-full px-2 text-[11px] font-semibold leading-none truncate">
                          {label}
                        </span>
                      </button>
                    )
                  })}

                  {/* External calendar (iCal) bookings — same bar treatment, color per linked feed */}
                  {externalBars.map((bar, ei) => {
                    const lane = extLanes[ei] ?? 0
                    const topPx = BAR_TOP_OFFSET_PX + lane * (BAR_HEIGHT_PX + BAR_GAP_PX)
                    return (
                    <div
                      key={bar.key}
                      role="status"
                      className={[
                        'pointer-events-none absolute z-[15] text-left rounded-r-sm',
                        bar.barClass,
                        bar.isStart ? 'rounded-l-sm' : '',
                      ].join(' ')}
                      style={{
                        top: topPx,
                        height: BAR_HEIGHT_PX,
                        left: `calc(${(bar.colStart / 7) * 100}% + 1px)`,
                        width: `calc(${((bar.colEnd - bar.colStart) / 7) * 100}% - 2px)`,
                      }}
                    >
                      <span className="flex items-center h-full px-2 text-[11px] font-semibold leading-none truncate">
                        {bar.label}
                      </span>
                    </div>
                    )
                  })}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
