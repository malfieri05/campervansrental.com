'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

/** Dispatched by `HostBookingRespondButtons` after a successful accept (before `router.refresh()`). */
export const HOST_BOOKING_ACCEPTED_EVENT = 'host-booking-accepted'

export default function HostBookingAcceptedToast() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let hide: ReturnType<typeof window.setTimeout> | undefined
    const onAccept = () => {
      if (hide) window.clearTimeout(hide)
      setOpen(true)
      hide = window.setTimeout(() => setOpen(false), 3800)
    }
    window.addEventListener(HOST_BOOKING_ACCEPTED_EVENT, onAccept)
    return () => {
      window.removeEventListener(HOST_BOOKING_ACCEPTED_EVENT, onAccept)
      if (hide) window.clearTimeout(hide)
    }
  }, [])

  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-4 w-4 text-emerald-700" aria-hidden strokeWidth={2.5} />
      </span>
      Booking accepted!
    </div>
  )
}
