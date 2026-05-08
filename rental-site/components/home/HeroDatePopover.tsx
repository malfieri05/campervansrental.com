'use client'

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

/** Max width (~20.5rem at 16px root) — sizing matches previous popover grid */
const PANEL_MAX_WIDTH_PX = 328
const PANEL_GAP_PX = 8
/** Approximate height for flip-aboveViewport logic */
const PANEL_EST_HEIGHT_PX = 360

function parseLocalDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateKeyLocal(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function startOfToday(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

type Field = 'checkIn' | 'checkOut'

type Props = {
  open: boolean
  field: Field
  value: string
  checkIn: string
  onSelect: (iso: string) => void
  onClear: () => void
  onClose: () => void
  /** Anchor: the Pick up row cell wrapper (whole hit area). */
  pickUpAnchorRef: RefObject<HTMLDivElement | null>
  /** Anchor: the Return row cell wrapper. */
  returnAnchorRef: RefObject<HTMLDivElement | null>
}

export default function HeroDatePopover({
  open,
  field,
  value,
  checkIn,
  onSelect,
  onClear,
  onClose,
  pickUpAnchorRef,
  returnAnchorRef,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [cursorMonth, setCursorMonth] = useState<Date>(() => startOfToday())
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })

  const reposition = useCallback(() => {
    if (typeof window === 'undefined') return

    const el =
      field === 'checkIn'
        ? pickUpAnchorRef.current
        : returnAnchorRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const w = Math.min(window.innerWidth - 16, PANEL_MAX_WIDTH_PX)
    const margin = 8

    let left = rect.left + rect.width / 2 - w / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))

    let top = rect.bottom + PANEL_GAP_PX
    if (top + PANEL_EST_HEIGHT_PX > window.innerHeight - margin) {
      top = rect.top - PANEL_EST_HEIGHT_PX - PANEL_GAP_PX
    }
    top = Math.max(margin, top)

    setPosition({ top, left })
  }, [field, pickUpAnchorRef, returnAnchorRef])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, field, reposition, cursorMonth])

  useEffect(() => {
    if (!open) return
    const handler = () => reposition()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [open, reposition])

  const minDate = useMemo(() => {
    const today = startOfToday()
    if (field === 'checkIn') return today
    if (checkIn) {
      try {
        return addDays(parseLocalDateOnly(checkIn), 1)
      } catch {
        return today
      }
    }
    return today
  }, [field, checkIn])

  const today = startOfToday()

  useEffect(() => {
    if (!open) return
    if (value?.trim()) {
      try {
        setCursorMonth(parseLocalDateOnly(value))
        return
      } catch {
        /* fall through */
      }
    }
    if (field === 'checkOut' && checkIn?.trim()) {
      try {
        setCursorMonth(parseLocalDateOnly(checkIn))
        return
      } catch {
        /* fall through */
      }
    }
    setCursorMonth(startOfToday())
  }, [open, value, field, checkIn])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return

    /**
     * Dismiss like a native anchored picker: any press outside the panel closes.
     * Capture phase runs before triggers; swallow the event whenever we aren't
     * switching to the *other* date field (otherwise the sibling cell's handler
     * can open after we set closed).
     */
    function onPointerDownCapture(e: PointerEvent) {
      const target = e.target as Node | null
      if (!target || panelRef.current?.contains(target)) return

      const onPickup = Boolean(pickUpAnchorRef.current?.contains(target))
      const onReturn = Boolean(returnAnchorRef.current?.contains(target))
      const switchesToOtherDateField =
        (field === 'checkIn' && onReturn) || (field === 'checkOut' && onPickup)

      onClose()

      if (!switchesToOtherDateField) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [open, field, onClose, pickUpAnchorRef, returnAnchorRef])

  const gridDays = useMemo(() => {
    const ms = startOfMonth(cursorMonth)
    const start = startOfWeek(ms)
    const end = endOfWeek(endOfMonth(ms))
    return eachDayOfInterval({ start, end })
  }, [cursorMonth])

  const disabled = (d: Date) => isBefore(d, minDate)

  const selectToday = () => {
    if (disabled(today)) return
    onSelect(dateKeyLocal(today))
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={field === 'checkIn' ? 'Pick up date calendar' : 'Return date calendar'}
      className="fixed z-[95] w-[min(100vw-1rem,20.5rem)]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="rounded-2xl border border-cream-300/70 bg-cream-50/[0.98] px-4 pb-4 pt-3 shadow-luxury ring-1 ring-forest-950/15 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70"
            onClick={() => setCursorMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="min-w-0 font-serif text-[0.95rem] font-semibold capitalize tracking-wide text-charcoal">
            {format(cursorMonth, 'MMM yyyy')}
          </span>
          <button
            type="button"
            aria-label="Next month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70"
            onClick={() => setCursorMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <div
              key={`w-${i}`}
              className="flex h-7 items-center justify-center font-display text-[0.65rem] font-bold uppercase tracking-[0.12em] text-forest-700/55"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 justify-items-center gap-y-1">
          {gridDays.map((d) => {
            const key = dateKeyLocal(d)
            const isOff = !isSameMonth(d, cursorMonth)
            const isSel = value === key
            const isToday = isSameDay(d, today)
            const isDis = disabled(d)

            return (
              <button
                key={key}
                type="button"
                disabled={isDis}
                onClick={() => !isDis && onSelect(key)}
                className={[
                  'flex h-9 w-10 items-center justify-center rounded-lg text-sm font-sans tabular-nums transition-colors',
                  isDis
                    ? 'cursor-not-allowed text-charcoal/25'
                    : 'text-charcoal hover:bg-gold-200/50',
                  isOff && !isDis ? 'text-charcoal/30' : '',
                  isSel
                    ? 'bg-gold-400 font-semibold text-forest-950 shadow-sm hover:bg-gold-400'
                    : '',
                  isToday && !isSel && !isDis
                    ? 'ring-2 ring-gold-500/45 ring-offset-2 ring-offset-cream-50'
                    : '',
                ].join(' ')}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-cream-200/90 pt-3">
          <button
            type="button"
            onClick={onClear}
            className="font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-forest-700/80 transition-colors hover:text-forest-950"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={selectToday}
            disabled={disabled(today)}
            className="font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-forest-700/80 transition-colors hover:text-forest-950 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}
