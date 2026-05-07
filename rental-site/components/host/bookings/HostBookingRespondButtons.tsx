'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { HOST_BOOKING_ACCEPTED_EVENT } from '@/components/host/bookings/HostBookingAcceptedToast'

type Props = {
  reservationId: string
  /** DB reservation status row */
  dbStatus: string
}

function declineExplanation(dbStatus: string) {
  return dbStatus === 'pending_payment'
    ? 'This will cancel the request and reopen the dates for other guests. If Stripe shows the guest already paid, their reservation fee will be refunded.'
    : 'If the reservation fee was paid, the guest will be refunded automatically.'
}

export default function HostBookingRespondButtons({ reservationId, dbStatus }: Props) {
  const router = useRouter()
  const [active, setActive] = useState<'accept' | 'deny' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [declineOpen, setDeclineOpen] = useState(false)

  useEffect(() => {
    if (!declineOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active === null) setDeclineOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [declineOpen, active])

  async function executeRespond(action: 'accept' | 'deny') {
    if (active !== null) return
    setErr(null)
    setActive(action)
    try {
      const res = await fetch(`/api/host/reservations/${reservationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong')

      setErr(null)
      if (action === 'deny') setDeclineOpen(false)
      if (action === 'accept') {
        window.dispatchEvent(new Event(HOST_BOOKING_ACCEPTED_EVENT))
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setActive(null)
    }
  }

  return (
    <>
      <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
        {err && !declineOpen && <p className="text-xs text-red-600 text-right max-w-xs">{err}</p>}
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            disabled={active !== null}
            onClick={() => void executeRespond('accept')}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {active === 'accept' ? 'Accepting…' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={active !== null}
            onClick={() => {
              setErr(null)
              setDeclineOpen(true)
            }}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>

      {declineOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => active === null && setDeclineOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-booking-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="decline-booking-title" className="text-lg font-bold text-neutral-900">
                  Are you sure?
                </h2>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{declineExplanation(dbStatus)}</p>
              </div>
            </div>
            {err && active === null && (
              <p role="alert" className="mt-4 text-sm text-red-600 leading-snug">
                {err}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={active !== null}
                onClick={() => setDeclineOpen(false)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={active !== null}
                onClick={() => void executeRespond('deny')}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {active === 'deny' ? 'Declining…' : 'Yes, decline'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
