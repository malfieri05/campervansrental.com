'use client'

import { useState, useTransition } from 'react'
import { X, CalendarRange } from 'lucide-react'
import { addHostAvailabilityBlock } from '@/app/host/listings/actions'
import { clearHostAvailabilityInRange } from '@/app/host/listings/actions'

type Props = {
  listingId: string
  onClose: () => void
  onApplied: () => void
}

export default function UpdateAvailabilityModal({ listingId, onClose, onApplied }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState<'unavailable' | 'available'>('unavailable')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!from || !to) { setError('Please select both a start and end date.'); return }
    if (to <= from) { setError('End date must be after start date.'); return }
    setError(null)

    // end date from picker is last blocked day; store as exclusive end (half-open)
    const endExclusive = new Date(to + 'T12:00:00')
    endExclusive.setDate(endExclusive.getDate() + 1)
    const endStr = endExclusive.toISOString().slice(0, 10)

    startTransition(async () => {
      let result: { ok: boolean; error?: string }
      if (mode === 'unavailable') {
        result = await addHostAvailabilityBlock(listingId, from, endStr)
      } else {
        result = await clearHostAvailabilityInRange(listingId, from, endStr)
      }
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      onApplied()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-brand-gold" />
            <h2 className="text-base font-bold text-neutral-900">Update availability</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Availability type */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Availability</p>
            <div className="grid grid-cols-2 gap-2">
              {(['unavailable', 'available'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMode(opt)}
                  className={[
                    'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                    mode === opt
                      ? opt === 'unavailable'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-green-400 bg-green-50 text-green-700'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300',
                  ].join(' ')}
                >
                  {opt === 'unavailable' ? 'Unavailable' : 'Available'}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              {mode === 'unavailable'
                ? 'Block these dates — guests will not be able to start or end a trip here.'
                : 'Unblock these dates — remove any host-blocked periods in this range.'}
            </p>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !from || !to}
            className="rounded-xl bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold/90 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
