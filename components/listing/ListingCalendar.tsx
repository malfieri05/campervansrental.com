'use client'

import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { BlockRange } from '@/lib/availability'
import { todayDateKey } from '@/lib/listing-date-selection'

type Props = {
  blocks: BlockRange[]
  readOnly?: boolean
  /** Host mode: first tap check-in, second tap check-out (exclusive). Stored half-open [start, end). */
  onAddHostBlock?: (start: string, endExclusive: string) => void
  /** Renter mode: controlled selected dates */
  checkIn?: string | null
  checkOut?: string | null
  /** Called with the clicked day key; parent manages checkIn/checkOut state */
  onDateClick?: (key: string) => void
  className?: string
  /**
   * Wide overlay (e.g. listing sidebar popover): always show two months side-by-side
   * with comfortable cell sizing — avoids squashed grids inside narrow columns.
   */
  layout?: 'inline' | 'overlay'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function isDayInHalfOpenBlock(day: Date, start: string, endExclusive: string) {
  const t = new Date(day)
  t.setHours(12, 0, 0, 0)
  const ds = new Date(start + 'T12:00:00').getTime()
  const de = new Date(endExclusive + 'T12:00:00').getTime()
  return t.getTime() >= ds && t.getTime() < de
}

function blockStyle(type: BlockRange['type']) {
  if (type === 'confirmed_reservation') return 'bg-forest-800 text-cream-100'
  return 'bg-gold-200/80 text-forest-900'
}

function monthGridDays(monthStart: Date) {
  const start = startOfWeek(startOfMonth(monthStart))
  const end = endOfWeek(endOfMonth(monthStart))
  return eachDayOfInterval({ start, end })
}

function isKeyInRange(key: string, checkIn: string | null | undefined, checkOut: string | null | undefined) {
  if (!checkIn || !checkOut) return false
  return key > checkIn && key < checkOut
}

type MonthPaneProps = {
  monthAnchor: Date
  gridDays: Date[]
  blockedLookup: Map<string, BlockRange['type']>
  readOnly: boolean
  /** Host selection */
  selStart: string | null
  onDayClick: (d: Date) => void
  /** Renter selection */
  checkIn?: string | null
  checkOut?: string | null
  /** yyyy-MM-dd local today — disables past nights for renters */
  todayKey: string
  leadingNav?: ReactNode
  trailingNav?: ReactNode
}

function MonthPane({
  monthAnchor,
  gridDays,
  blockedLookup,
  readOnly,
  selStart,
  onDayClick,
  checkIn,
  checkOut,
  leadingNav,
  trailingNav,
  todayKey,
}: MonthPaneProps) {
  const placeholder = <span className="inline-flex w-9 h-9 shrink-0" aria-hidden />
  const renterMode = checkIn !== undefined
  const pickingCheckout = renterMode && Boolean(checkIn && !checkOut)

  return (
    <div className="rounded-xl border border-cream-300/60 bg-cream-50/90 p-3 sm:p-4 shadow-luxury-sm">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-1 mb-3">
        <div className="flex justify-start">{leadingNav ?? placeholder}</div>
        <span className="font-display text-[0.7rem] sm:text-xs font-bold uppercase tracking-[0.12em] text-forest-800 text-center leading-tight">
          {format(monthAnchor, 'MMMM yyyy')}
        </span>
        <div className="flex justify-end">{trailingNav ?? placeholder}</div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center font-display text-[0.55rem] sm:text-[0.65rem] uppercase tracking-wide text-charcoal/40 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {gridDays.map((d) => {
          const key = dayKey(d)
          const inMonth = isSameMonth(d, monthAnchor)
          const blocked = blockedLookup.get(key)

          // Renter mode styling
          const isCheckIn = renterMode && checkIn === key
          const isCheckOut = renterMode && checkOut === key
          const inRange = renterMode && isKeyInRange(key, checkIn, checkOut)

          // Host mode (legacy)
          const selected = !renterMode && selStart === key

          const isDisabled = readOnly && !renterMode
          const isPastDay = renterMode && key < todayKey
          const isBlockedInRenterMode = renterMode && Boolean(blocked)
          /** Checkout can land on a calendar day that starts a block; range overlap is validated in `resolveListingDateClick`. */
          const renterDayDisabled =
            renterMode && (isPastDay || (!pickingCheckout && isBlockedInRenterMode))

          return (
            <button
              key={`${format(monthAnchor, 'yyyy-MM')}-${key}`}
              type="button"
              disabled={isDisabled || renterDayDisabled}
              onClick={() => onDayClick(d)}
              title={
                isPastDay
                  ? 'Cannot select past dates'
                  : isBlockedInRenterMode
                    ? 'Unavailable'
                    : undefined
              }
              className={[
                'min-h-[2.35rem] sm:min-h-[2.5rem] rounded-lg text-xs font-sans flex items-center justify-center transition-all duration-150 relative',
                inMonth ? 'text-charcoal' : 'text-charcoal/25',
                // Renter: check-in / check-out endpoints
                isCheckIn || isCheckOut
                  ? 'bg-gold-400 text-forest-950 font-bold shadow-gold z-10'
                  : '',
                // Renter: in-range fill
                inRange && !blocked
                  ? 'bg-gold-100 text-charcoal rounded-none'
                  : '',
                inRange && blocked
                  ? 'bg-gold-100/50 text-charcoal/40 rounded-none line-through'
                  : '',
                // Blocked day (no renter selection active yet)
                !isCheckIn && !isCheckOut && !inRange && blocked
                  ? `${blockStyle(blocked)} font-medium`
                  : '',
                // Unselected normal day
                !isCheckIn && !isCheckOut && !inRange && !blocked
                  ? 'bg-cream-100/90 border border-cream-200/50 hover:bg-cream-200/70'
                  : '',
                // Host selection
                selected ? 'ring-2 ring-gold-500' : '',
                isBlockedInRenterMode && !isCheckIn && !isCheckOut
                  ? 'opacity-40 cursor-not-allowed'
                  : '',
                isPastDay && !isCheckIn && !isCheckOut ? 'opacity-35 cursor-not-allowed' : '',
                isDisabled || renterDayDisabled ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ListingCalendar({
  blocks,
  readOnly = true,
  onAddHostBlock,
  checkIn,
  checkOut,
  onDateClick,
  className = '',
  layout = 'inline',
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  /** Host-mode internal selection start */
  const [selStart, setSelStart] = useState<string | null>(null)

  const renterMode = checkIn !== undefined
  const todayKey = todayDateKey()

  const secondMonth = useMemo(() => addMonths(cursor, 1), [cursor])
  const gridDaysLeft = useMemo(() => monthGridDays(cursor), [cursor])
  const gridDaysRight = useMemo(() => monthGridDays(secondMonth), [secondMonth])

  const blockedLookup = useMemo(() => {
    const unique = new Map<string, Date>()
    for (const d of [...gridDaysLeft, ...gridDaysRight]) {
      unique.set(dayKey(d), d)
    }
    const map = new Map<string, BlockRange['type']>()
    for (const d of Array.from(unique.values())) {
      const key = dayKey(d)
      for (const b of blocks) {
        if (isDayInHalfOpenBlock(d, b.start, b.end)) {
          map.set(key, b.type)
          break
        }
      }
    }
    return map
  }, [blocks, gridDaysLeft, gridDaysRight])

  const onDayClick = (d: Date) => {
    const key = dayKey(d)
    const pickingCheckout = Boolean(checkIn && !checkOut)

    // Renter mode: delegate all state to parent
    if (renterMode && onDateClick) {
      if (key < todayKey) return
      if (!pickingCheckout && blockedLookup.get(key)) return
      onDateClick(key)
      return
    }

    // Host mode: internal two-tap block selection
    if (readOnly || !onAddHostBlock) return
    if (!selStart) {
      setSelStart(key)
      return
    }
    const a = new Date(selStart + 'T12:00:00')
    const b = new Date(key + 'T12:00:00')
    let startD = a <= b ? a : b
    let endCheckout = a <= b ? b : a
    if (differenceInCalendarDays(endCheckout, startD) === 0) {
      endCheckout = new Date(startD.getTime() + 86400000)
    }
    const startStr = format(startD, 'yyyy-MM-dd')
    const endStr = format(endCheckout, 'yyyy-MM-dd')
    onAddHostBlock(startStr, endStr)
    setSelStart(null)
  }

  const navBtnClass =
    'inline-flex w-9 h-9 items-center justify-center rounded-lg border border-cream-300/70 bg-cream-100/80 text-charcoal hover:bg-cream-200/80 hover:border-cream-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400'

  const dualMonthClass =
    layout === 'overlay'
      ? 'grid grid-cols-1 min-[520px]:grid-cols-2 gap-3 sm:gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 gap-4'

  return (
    <div className={className}>
      <div className={dualMonthClass}>
        <MonthPane
          monthAnchor={cursor}
          gridDays={gridDaysLeft}
          blockedLookup={blockedLookup}
          readOnly={readOnly}
          selStart={selStart}
          onDayClick={onDayClick}
          checkIn={checkIn}
          checkOut={checkOut}
          todayKey={todayKey}
          leadingNav={
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              className={navBtnClass}
              aria-label="Previous months"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          }
        />
        <MonthPane
          monthAnchor={secondMonth}
          gridDays={gridDaysRight}
          blockedLookup={blockedLookup}
          readOnly={readOnly}
          selStart={selStart}
          onDayClick={onDayClick}
          checkIn={checkIn}
          checkOut={checkOut}
          todayKey={todayKey}
          trailingNav={
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className={navBtnClass}
              aria-label="Next months"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          }
        />
      </div>

      {!readOnly && !renterMode && (
        <p className="mt-4 font-sans text-xs text-charcoal/45">
          Tap check-in, then check-out day. Same day twice blocks a single night.
        </p>
      )}
    </div>
  )
}
