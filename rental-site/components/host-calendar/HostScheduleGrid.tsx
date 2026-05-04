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
import type { CalendarReservation, BlockRow } from '@/app/host/calendar/page'
import type { TripStatusFilter } from './HostCalendarSidebar'

const MONTHS_SHOWN = 6

type Props = {
  blocks: BlockRow[]
  reservations: CalendarReservation[]
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
  if (r.status === 'pending_payment' || r.status === 'pending') return 'pending'
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

function formatNightlyRate(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

  const blockedDates = useMemo(() => {
    const set = new Set<string>()
    for (const b of blocks) {
      if (b.block_type === 'host_blocked' || b.block_type === 'external_sync') {
        let cur = parseISO(b.start_date)
        const end = parseISO(b.end_date)
        while (isBefore(cur, end)) { set.add(format(cur, 'yyyy-MM-dd')); cur = addDays(cur, 1) }
      }
    }
    return set
  }, [blocks])

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

              return (
                <div key={wi} className="relative z-0 grid grid-cols-7 border-b border-neutral-100 last:border-b-0">
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
                        className={[
                          'relative min-h-[96px] border-r border-neutral-100 px-2 pt-2 pb-1.5 text-left outline-none ring-inset transition-colors duration-150 last:border-r-0 focus-visible:ring-2 focus-visible:ring-gold-400/70 flex flex-col',
                          hoverTint,
                          !isCurrentMonth ? 'cursor-pointer bg-neutral-50' : isBlocked ? 'cursor-pointer bg-red-50/40' : 'cursor-pointer bg-white',
                        ].join(' ')}
                        aria-label={`Update availability starting ${format(day, 'MMMM d, yyyy')}`}
                      >
                        {/* Day number */}
                        <span
                          className={[
                            'pointer-events-none text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full shrink-0',
                            isToday
                              ? 'bg-gold-400 text-white ring-1 ring-gold-600/40'
                              : !isCurrentMonth
                                ? 'text-neutral-300'
                                : isBlocked
                                  ? 'text-red-400'
                                  : 'text-neutral-700',
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
                    const label = bar.guest_first_name
                      ? `${guestLabel(bar.guest_first_name, bar.guest_last_name)}  ${STATUS_LABELS[bar.category as StatusCategory]}`
                      : STATUS_LABELS[bar.category as StatusCategory]

                    return (
                      <button
                        key={`${bar.id}-${bi}`}
                        type="button"
                        onClick={() => onReservationClick(bar.id)}
                        className={[
                          'absolute z-10 cursor-pointer text-left focus:outline-none',
                          BAR_STYLES[bar.category as StatusCategory],
                          'rounded-r-sm hover:brightness-95 transition-all',
                          bar.isStart ? 'rounded-l-sm' : '',
                        ].join(' ')}
                        style={{
                          // Position within the cell: below the day number (~32px)
                          top: '34px',
                          height: '26px',
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
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
