'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'
import { addDays, format, parseISO, isAfter } from 'date-fns'
import { addHostAvailabilityBlock, clearHostAvailabilityInRange } from '@/app/host/listings/actions'

type AvailabilityMode = 'available' | 'no_trips' | 'unavailable'

type Props = {
  listingId: string
  pricePerNight: number | null
  onClose: () => void
  onApplied: () => void
  /** When set (e.g. calendar day click), pre-fill From / To — yyyy-MM-dd */
  initialFrom?: string
  initialTo?: string
}

const AVAILABILITY_OPTIONS: { value: AvailabilityMode; label: string; description?: string }[] = [
  {
    value: 'available',
    label: 'Available',
  },
  {
    value: 'no_trips',
    label: 'No trips start or end',
    description: 'Vehicle is available to rent, but no trips can start or end on the selected day(s).',
  },
  {
    value: 'unavailable',
    label: 'Unavailable',
    description: "Vehicle isn't available to rent.",
  },
]

export default function UpdateAvailabilityModal({
  listingId,
  pricePerNight,
  onClose,
  onApplied,
  initialFrom,
  initialTo,
}: Props) {
  const [from, setFrom] = useState(initialFrom ?? '')
  const [to, setTo] = useState(initialTo ?? initialFrom ?? '')
  const [mode, setMode] = useState<AvailabilityMode>('unavailable')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFrom(initialFrom ?? '')
    setTo(initialTo ?? initialFrom ?? '')
    setMode('unavailable')
    setError(null)
  }, [listingId, initialFrom, initialTo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleApply = () => {
    if (!from || !to) { setError('Please select both a start and end date.'); return }
    const startDay = parseISO(`${from}T12:00:00`)
    const endInclusive = parseISO(`${to}T12:00:00`)
    if (isAfter(startDay, endInclusive)) { setError('End date must be on or after the start date.'); return }
    setError(null)

    // Half-open [start, end): exclusive end = day after last selected day
    const startStr = format(startDay, 'yyyy-MM-dd')
    const endStr = format(addDays(endInclusive, 1), 'yyyy-MM-dd')

    startTransition(async () => {
      let result: { ok: boolean; error?: string }
      if (mode === 'available') {
        result = await clearHostAvailabilityInRange(listingId, startStr, endStr)
      } else {
        // 'unavailable' and 'no_trips' both block the date range
        result = await addHostAvailabilityBlock(listingId, startStr, endStr)
      }
      if (!result.ok) { setError(result.error ?? 'Something went wrong.'); return }
      onApplied()
      onClose()
    })
  }

  const nightlyRateStr = pricePerNight != null
    ? `$${(pricePerNight / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-neutral-200 overflow-hidden">

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Date pickers */}
        <div className="grid grid-cols-2 border-b border-neutral-200">
          <div className="px-5 py-4 border-r border-neutral-200">
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">From</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-neutral-900 focus:outline-none"
              />
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0 pointer-events-none" />
            </div>
          </div>
          <div className="px-5 py-4">
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">To</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-neutral-900 focus:outline-none"
              />
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Edit availability section */}
        <div className="px-5 py-4 border-b border-neutral-200">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-neutral-900 mb-4 w-full text-left"
          >
            Edit availability
            <span className="ml-1 text-neutral-400">^</span>
          </button>

          <div className="space-y-3">
            {AVAILABILITY_OPTIONS.map(({ value, label, description }) => {
              const isNoTrips = value === 'no_trips'
              return (
                <label
                  key={value}
                  className={[
                    'flex items-start gap-3 cursor-pointer group',
                    isNoTrips ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="radio"
                      name="availability-mode"
                      value={value}
                      checked={mode === value}
                      disabled={isNoTrips}
                      onChange={() => !isNoTrips && setMode(value)}
                      className="sr-only"
                    />
                    <div
                      className={[
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                        mode === value && !isNoTrips
                          ? 'border-neutral-800 bg-white'
                          : 'border-neutral-300 bg-white',
                      ].join(' ')}
                    >
                      {mode === value && !isNoTrips && (
                        <div className="h-2 w-2 rounded-full bg-neutral-800" />
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-neutral-900 font-medium">{label}</span>
                    {isNoTrips && (
                      <span className="ml-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Coming soon</span>
                    )}
                    {description && (
                      <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Nightly rate adjustment section */}
        <div className="px-5 py-4 border-b border-neutral-200">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-neutral-900 mb-3 w-full text-left"
          >
            Nightly rate adjustment
            <span className="ml-1 text-neutral-400">^</span>
          </button>

          <p className="text-sm text-neutral-600 mb-3">
            {nightlyRateStr
              ? `Your current nightly rate is ${nightlyRateStr}.`
              : 'Set a nightly rate on your listing to enable rate adjustments.'}
          </p>

          <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
            <p className="text-xs text-neutral-500 font-medium">Per-date rate overrides and smart pricing coming soon.</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 pt-3">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-sm font-semibold text-neutral-700 underline underline-offset-2 hover:text-neutral-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !from || !to}
            className="rounded-full bg-rose-400 px-6 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
