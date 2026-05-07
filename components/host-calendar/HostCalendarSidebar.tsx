'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronDown, CalendarClock, Settings2, Link2, Check, Loader2 } from 'lucide-react'
import type { HostListingMeta, ExternalFeed, ExportUrlFetchStatus } from '@/app/host/calendar/page'
import CalendarSyncModal from './CalendarSyncModal'
import { getFeedColorTheme } from '@/lib/calendar-feed-colors'

export type TripStatusFilter = {
  pending: boolean
  confirmed_upcoming: boolean
  currently_hosting: boolean
  completed: boolean
}

type Props = {
  listings: HostListingMeta[]
  selectedId: string | null
  onSelectListing: (id: string) => void
  filters: TripStatusFilter
  onFiltersChange: (f: TripStatusFilter) => void
  feeds: ExternalFeed[]
  onFeedsChange: (feeds: ExternalFeed[]) => void
  exportUrl: string | null
  exportUrlStatus: ExportUrlFetchStatus
  onOpenAvailability: () => void
}

const FILTER_LABELS: { key: keyof TripStatusFilter; label: string; color: string }[] = [
  { key: 'pending',            label: 'Pending request',   color: 'bg-amber-400' },
  { key: 'confirmed_upcoming', label: 'Confirmed',         color: 'bg-emerald-500' },
  { key: 'currently_hosting',  label: 'Currently hosting', color: 'bg-blue-500' },
  { key: 'completed',          label: 'Completed',         color: 'bg-neutral-400' },
]

export default function HostCalendarSidebar({
  listings,
  selectedId,
  onSelectListing,
  filters,
  onFiltersChange,
  feeds,
  onFeedsChange,
  exportUrl,
  exportUrlStatus,
  onOpenAvailability,
}: Props) {
  const [listingDropOpen, setListingDropOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [exportCopied, setExportCopied] = useState(false)
  const exportUrlInputRef = useRef<HTMLInputElement>(null)

  const selected = listings.find((l) => l.id === selectedId) ?? listings[0] ?? null

  const toggleFilter = (key: keyof TripStatusFilter) => {
    onFiltersChange({ ...filters, [key]: !filters[key] })
  }

  const handleCopyExportUrl = async () => {
    if (!exportUrl) return
    try {
      await navigator.clipboard.writeText(exportUrl)
      setExportCopied(true)
      window.setTimeout(() => setExportCopied(false), 2000)
    } catch {
      const el = exportUrlInputRef.current
      if (!el) return
      el.focus()
      el.select()
    }
  }

  return (
    <>
      <aside className="flex w-full shrink-0 flex-col gap-0 border-b border-neutral-200 bg-white lg:h-full lg:min-h-0 lg:w-[280px] lg:shrink-0 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Calendar</h1>
        </div>

        {/* Listing picker */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Listing</p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setListingDropOpen((o) => !o)}
              className="w-full flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left hover:border-neutral-300 transition-colors"
            >
              {selected?.primary_image_url ? (
                <div className="h-10 w-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                  <Image
                    src={selected.primary_image_url}
                    alt={selected.title}
                    width={56}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-14 shrink-0 rounded-lg bg-neutral-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate leading-snug">
                  {selected?.title ?? 'Select a listing'}
                </p>
                {selected?.price_per_night_cents != null && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    ${(selected.price_per_night_cents / 100).toFixed(0)}/night
                  </p>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform ${listingDropOpen ? 'rotate-180' : ''}`} />
            </button>

            {listingDropOpen && listings.length > 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-neutral-200 bg-white shadow-lg py-1.5 max-h-64 overflow-y-auto">
                {listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => { onSelectListing(l.id); setListingDropOpen(false) }}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      l.id === selectedId ? 'bg-amber-50' : 'hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    {l.primary_image_url ? (
                      <div className="h-8 w-12 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                        <Image src={l.primary_image_url} alt={l.title} width={48} height={32} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-12 shrink-0 rounded-lg bg-neutral-100" />
                    )}
                    <span className={`text-sm truncate ${l.id === selectedId ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
                      {l.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Update availability CTA */}
          <button
            type="button"
            onClick={onOpenAvailability}
            className="mt-3 mx-auto block w-[85%] rounded-xl bg-gold-400 py-[calc(0.625rem*0.85)] text-center text-[calc(0.875rem*0.85)] font-semibold text-white shadow-none ring-1 ring-gold-600/30 hover:bg-gold-300 transition-colors"
          >
            Update availability
          </button>
        </div>

        {/* Trip status filters */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">Trip status</p>
          <ul className="space-y-2">
            {FILTER_LABELS.map(({ key, label, color }) => (
              <li key={key} className="flex items-center gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={filters[key]}
                  onClick={() => toggleFilter(key)}
                  className={[
                    'h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-all',
                    filters[key]
                      ? `${color} border-transparent`
                      : 'border-neutral-300 bg-white',
                  ].join(' ')}
                >
                  {filters[key] && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-neutral-700">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Calendar sync */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Calendar sync</p>
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
              aria-label="Manage calendar sync"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {feeds.length === 0 ? (
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600 transition-colors"
            >
              <CalendarClock className="h-4 w-4" />
              Connect a calendar
            </button>
          ) : (
            <ul className="space-y-1.5">
              {feeds.map((f, i) => (
                <li key={f.id} className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${f.last_sync_error ? 'bg-red-400' : getFeedColorTheme(i).dotClass}`}
                  />
                  <span className="text-xs text-neutral-600 truncate">{f.display_name}</span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(true)}
                  className="mt-0.5 text-[calc(0.75rem*1.1)] leading-tight text-gold-700 hover:underline"
                >
                  Manage
                </button>
              </li>
            </ul>
          )}

          {selectedId && (
            <div className="mt-4 border-t border-neutral-100 pt-3">
              <p className="text-sm font-semibold text-neutral-900 mb-1 leading-snug">Export Calendar:</p>
              <p className="text-xs text-neutral-500 mb-2 leading-snug">
                Paste this link on other platforms to sync your bookings.
              </p>
              {exportUrlStatus === 'loading' && (
                <p className="inline-flex items-center gap-2 text-xs text-neutral-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                  Loading your link…
                </p>
              )}
              {exportUrlStatus === 'unavailable' && (
                <p className="text-xs text-amber-800/90 leading-snug">
                  Calendar link isn&apos;t available yet. Ask your admin to set{' '}
                  <code className="rounded bg-amber-100/80 px-1 py-0.5 text-[10px]">CALENDAR_EXPORT_SECRET</code>{' '}
                  in server environment variables, then reload.
                </p>
              )}
              {exportUrlStatus === 'ready' && exportUrl && (
                <>
                  <input
                    ref={exportUrlInputRef}
                    type="text"
                    readOnly
                    value={exportUrl}
                    tabIndex={-1}
                    aria-hidden
                    className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                  />
                  <button
                    type="button"
                    onClick={handleCopyExportUrl}
                    aria-label={exportCopied ? 'Calendar URL copied to clipboard' : 'Copy calendar subscription URL to clipboard'}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600 transition-colors"
                  >
                    {exportCopied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <span>Copy URL</span>
                        <Link2 className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {syncModalOpen && selectedId && (
        <CalendarSyncModal
          listingId={selectedId}
          feeds={feeds}
          exportUrl={exportUrl}
          exportUrlStatus={exportUrlStatus}
          onClose={() => setSyncModalOpen(false)}
          onFeedsChange={(updated) => { onFeedsChange(updated); }}
        />
      )}
    </>
  )
}
