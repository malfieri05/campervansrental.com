'use client'

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
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
   * inline: wraps both months in a single styled card.
   * overlay: renders months without a wrapper (the portal container is the card).
   */
  layout?: 'inline' | 'overlay'
  /** Minimum nights required for this listing — drives hover preview snapping. */
  minNights?: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function addDaysKey(isoDay: string, days: number): string {
  return format(addDays(parseISO(`${isoDay}T12:00:00`), days), 'yyyy-MM-dd')
}

function isDayInHalfOpenBlock(day: Date, start: string, endExclusive: string) {
  const t = new Date(day)
  t.setHours(12, 0, 0, 0)
  const ds = new Date(start + 'T12:00:00').getTime()
  const de = new Date(endExclusive + 'T12:00:00').getTime()
  return t.getTime() >= ds && t.getTime() < de
}

/** Unavailable nights: Outdoorsy-style muted + strikethrough (no filled “pill”). */
const UNAVAILABLE_DAY =
  'text-charcoal/40 line-through decoration-charcoal/35 bg-transparent border-transparent shadow-none'

function monthGridDays(monthStart: Date) {
  const start = startOfWeek(startOfMonth(monthStart))
  const end = endOfWeek(endOfMonth(monthStart))
  return eachDayOfInterval({ start, end })
}

function isKeyInRange(
  key: string,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
) {
  if (!checkIn || !checkOut) return false
  return key > checkIn && key < checkOut
}

type MonthPaneProps = {
  monthAnchor: Date
  gridDays: Date[]
  blockedLookup: Map<string, BlockRange['type']>
  readOnly: boolean
  selStart: string | null
  onDayClick: (d: Date) => void
  onDayHover: (key: string | null) => void
  checkIn?: string | null
  checkOut?: string | null
  todayKey: string
  /** Inclusive upper bound of the hover preview range; null means no preview. */
  hoverPreviewEnd: string | null
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
  onDayHover,
  checkIn,
  checkOut,
  hoverPreviewEnd,
  leadingNav,
  trailingNav,
  todayKey,
}: MonthPaneProps) {
  const placeholder = <span className="inline-flex w-9 h-9 shrink-0" aria-hidden />
  const renterMode = checkIn !== undefined
  const pickingCheckout = renterMode && Boolean(checkIn && !checkOut)

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-1 mb-3">
        <div className="flex justify-start">{leadingNav ?? placeholder}</div>
        <span className="font-display text-[0.7rem] sm:text-xs font-bold uppercase tracking-[0.12em] text-forest-800 text-center leading-tight">
          {format(monthAnchor, 'MMMM yyyy')}
        </span>
        <div className="flex justify-end">{trailingNav ?? placeholder}</div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center font-display text-[0.55rem] sm:text-[0.65rem] uppercase tracking-wide text-charcoal mb-2">
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

          // Hover preview: active while picking checkout, shows min-nights floor or cursor extent
          const inHoverPreview =
            pickingCheckout &&
            hoverPreviewEnd != null &&
            checkIn != null &&
            key > checkIn &&
            key <= hoverPreviewEnd

          // Host mode (legacy)
          const selected = !renterMode && selStart === key

          const isDisabled = readOnly && !renterMode
          const isPastDay = renterMode && key < todayKey
          const isBlockedInRenterMode = renterMode && Boolean(blocked)
          const renterDayDisabled =
            renterMode && (isPastDay || (!pickingCheckout && isBlockedInRenterMode))

          const baseCell =
            'min-h-[2.35rem] sm:min-h-[2.5rem] rounded-lg text-xs font-sans flex items-center justify-center transition-all duration-100 relative'

          let surface = ''
          if (isCheckIn || isCheckOut) {
            surface = 'bg-gold-400 text-forest-950 font-bold shadow-gold z-10'
          } else if (inRange && !blocked) {
            surface = 'bg-gold-100 text-charcoal'
          } else if (inRange && blocked) {
            surface = UNAVAILABLE_DAY
          } else if (inHoverPreview && !blocked) {
            surface = 'bg-gold-200/55 text-charcoal'
          } else if (inHoverPreview && blocked) {
            surface = UNAVAILABLE_DAY
          } else if (blocked) {
            surface = UNAVAILABLE_DAY
          } else if (inMonth) {
            surface = 'text-charcoal bg-cream-100/90 border border-cream-200/50 hover:bg-cream-200/70'
          } else {
            surface = 'text-charcoal/25 bg-cream-100/40 border border-cream-200/30'
          }

          return (
            <button
              key={`${format(monthAnchor, 'yyyy-MM')}-${key}`}
              type="button"
              disabled={isDisabled || renterDayDisabled}
              onClick={() => onDayClick(d)}
              onMouseEnter={() => pickingCheckout && onDayHover(key)}
              onMouseLeave={() => pickingCheckout && onDayHover(null)}
              title={
                isPastDay
                  ? 'Cannot select past dates'
                  : isBlockedInRenterMode
                    ? 'Unavailable'
                    : undefined
              }
              className={[
                baseCell,
                surface,
                selected ? 'ring-2 ring-gold-500' : '',
                isBlockedInRenterMode && !isCheckIn && !isCheckOut
                  ? 'cursor-not-allowed'
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
  minNights = 1,
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selStart, setSelStart] = useState<string | null>(null)
  const [hoverKey, setHoverKey] = useState<string | null>(null)

  const renterMode = checkIn !== undefined
  const todayKey = todayDateKey()
  const pickingCheckout = renterMode && Boolean(checkIn && !checkOut)

  /**
   * Hover preview end key:
   * - Always at least checkIn + minNights when picking checkout (shows the minimum floor immediately).
   * - Extends to hoverKey when the cursor moves beyond that floor.
   */
  const hoverPreviewEnd = useMemo((): string | null => {
    if (!pickingCheckout || !checkIn) return null
    const minCheckout = addDaysKey(checkIn, minNights)
    if (!hoverKey || hoverKey <= checkIn) return minCheckout
    return hoverKey >= minCheckout ? hoverKey : minCheckout
  }, [pickingCheckout, checkIn, hoverKey, minNights])

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
    const pickingCheckoutNow = Boolean(checkIn && !checkOut)

    // Renter mode: delegate all state to parent
    if (renterMode && onDateClick) {
      if (key < todayKey) return
      if (!pickingCheckoutNow && blockedLookup.get(key)) return
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

  const sharedMonthProps = {
    blockedLookup,
    readOnly,
    selStart,
    onDayClick,
    onDayHover: setHoverKey,
    checkIn,
    checkOut,
    todayKey,
    hoverPreviewEnd,
  }

  const monthsGrid = (
    <div
      className={
        layout === 'overlay'
          ? 'grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 sm:gap-6'
          : 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'
      }
    >
      <MonthPane
        {...sharedMonthProps}
        monthAnchor={cursor}
        gridDays={gridDaysLeft}
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
        {...sharedMonthProps}
        monthAnchor={secondMonth}
        gridDays={gridDaysRight}
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
  )

  return (
    <div className={className}>
      {layout === 'inline' ? (
        <div className="rounded-xl border border-cream-300/60 bg-cream-50/90 p-3 sm:p-5 shadow-luxury-sm">
          {monthsGrid}
        </div>
      ) : (
        monthsGrid
      )}

      {!readOnly && !renterMode && (
        <p className="mt-4 font-sans text-xs text-charcoal/45">
          Tap check-in, then check-out day. Same day twice blocks a single night.
        </p>
      )}
    </div>
  )
}
