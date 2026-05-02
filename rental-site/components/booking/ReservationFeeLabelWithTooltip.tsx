'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { RESERVATION_FEE_TOOLTIP } from '@/lib/booking-pricing'

export default function ReservationFeeLabelWithTooltip() {
  const tipId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null)

  useEffect(() => setMounted(true), [])

  const measure = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(272, window.innerWidth - 24)
    setCoords({
      left: r.left + r.width / 2,
      top: r.top,
      width,
    })
  }, [])

  useEffect(() => {
    if (!visible) return
    measure()
    const onScroll = () => measure()
    const onResize = () => measure()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [visible, measure])

  const show = () => {
    measure()
    setVisible(true)
  }
  const hide = () => setVisible(false)

  const tooltip =
    mounted &&
    visible &&
    coords &&
    createPortal(
      <span
        id={tipId}
        role="tooltip"
        style={{
          position: 'fixed',
          left: coords.left,
          top: coords.top,
          transform: 'translate(-50%, calc(-100% - 8px))',
          width: coords.width,
          zIndex: 10050,
        }}
        className="rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-left font-sans text-[0.7rem] font-normal leading-snug text-charcoal shadow-xl pointer-events-none"
      >
        {RESERVATION_FEE_TOOLTIP}
      </span>,
      document.body
    )

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start gap-1">
        <span className="leading-snug">Reservation fee</span>
        <button
          ref={btnRef}
          type="button"
          className="relative inline-flex shrink-0 translate-y-px rounded-full text-forest-700/80 outline-none hover:text-forest-900 focus-visible:ring-2 focus-visible:ring-forest-500/50"
          aria-label="Reservation fee refund policy"
          aria-describedby={visible ? tipId : undefined}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className="mt-0.5 font-sans text-[0.7rem] font-normal leading-snug text-charcoal/50">
        25% of total upfront
      </p>
      {tooltip}
    </div>
  )
}
