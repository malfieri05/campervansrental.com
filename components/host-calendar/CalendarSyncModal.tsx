'use client'

import { useState, useRef } from 'react'
import { X, RefreshCw, Trash2, Plus, Copy, Download, Check, AlertCircle, Loader2 } from 'lucide-react'
import type { ExternalFeed, ExportUrlFetchStatus } from '@/app/host/calendar/page'
import { format } from 'date-fns'

type Props = {
  listingId: string
  feeds: ExternalFeed[]
  exportUrl: string | null
  exportUrlStatus: ExportUrlFetchStatus
  onClose: () => void
  onFeedsChange: (feeds: ExternalFeed[]) => void
}

export default function CalendarSyncModal({
  listingId,
  feeds,
  exportUrl,
  exportUrlStatus,
  onClose,
  onFeedsChange,
}: Props) {
  const [localFeeds, setLocalFeeds] = useState<ExternalFeed[]>(feeds)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedExport, setCopiedExport] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!addName.trim() || !addUrl.trim()) { setAddError('Both name and URL are required.'); return }
    try { new URL(addUrl) } catch { setAddError('Please enter a valid URL.'); return }
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch('/api/host/calendar/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, display_name: addName.trim(), ical_url: addUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setAddError(json.error ?? 'Failed to add calendar.'); return }
      const updated = [...localFeeds, json.feed as ExternalFeed]
      setLocalFeeds(updated)
      onFeedsChange(updated)
      setAddName('')
      setAddUrl('')
      setShowAddForm(false)
      // Auto-sync the new feed
      handleSync(json.feed.id as string, updated)
    } finally {
      setAdding(false)
    }
  }

  const handleSync = async (feedId: string, currentFeeds?: ExternalFeed[]) => {
    setSyncingId(feedId)
    try {
      const res = await fetch(`/api/host/calendar/external/${feedId}/sync`, { method: 'POST' })
      const json = await res.json()
      const now = new Date().toISOString()
      const updated = (currentFeeds ?? localFeeds).map((f) =>
        f.id === feedId
          ? { ...f, last_synced_at: now, last_sync_error: res.ok ? null : (json.error ?? 'Sync failed') }
          : f
      )
      setLocalFeeds(updated)
      onFeedsChange(updated)
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (feedId: string) => {
    setDeletingId(feedId)
    try {
      const res = await fetch(`/api/host/calendar/external/${feedId}`, { method: 'DELETE' })
      if (!res.ok) return
      const updated = localFeeds.filter((f) => f.id !== feedId)
      setLocalFeeds(updated)
      onFeedsChange(updated)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyExport = async () => {
    if (!exportUrl) return
    try {
      await navigator.clipboard.writeText(exportUrl)
      setCopiedExport(true)
      setTimeout(() => setCopiedExport(false), 2000)
    } catch {
      urlRef.current?.select()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-bold text-neutral-900">Calendar sync</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Connected feeds */}
          <div className="px-6 pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Connected calendars</p>

            {localFeeds.length === 0 && !showAddForm && (
              <p className="text-sm text-neutral-400 py-3">No calendars connected yet. Add one below to sync your availability across platforms.</p>
            )}

            <ul className="space-y-2">
              {localFeeds.map((feed) => (
                <li key={feed.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{feed.display_name}</p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{feed.ical_url}</p>
                      {feed.last_sync_error ? (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{feed.last_sync_error}</span>
                        </div>
                      ) : feed.last_synced_at ? (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Synced {format(new Date(feed.last_synced_at), 'MMM d, h:mm a')}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 mt-0.5">Not yet synced</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleSync(feed.id)}
                        disabled={syncingId === feed.id}
                        title="Sync now"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors disabled:opacity-40"
                      >
                        {syncingId === feed.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <RefreshCw className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(feed.id)}
                        disabled={deletingId === feed.id}
                        title="Remove"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        {deletingId === feed.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Add calendar form */}
            {showAddForm ? (
              <div className="mt-3 rounded-xl border border-gold-400/40 bg-amber-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-neutral-700">Add calendar</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Airbnb, Outdoorsy)"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
                  />
                  <input
                    type="url"
                    placeholder="https://… (iCal URL)"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
                  />
                </div>
                {addError && <p className="text-xs text-red-600">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddError(null) }}
                    className="flex-1 rounded-xl border border-neutral-200 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex-1 rounded-xl bg-gold-400 py-2 text-sm font-semibold text-white shadow-gold hover:bg-gold-300 transition-colors disabled:opacity-40"
                  >
                    {adding ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add a calendar
              </button>
            )}
          </div>

          {/* Export section */}
          <div className="border-t border-neutral-100 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Export your calendar</p>
            <p className="text-xs text-neutral-400 mb-3">
              Copy this URL into other platforms (Airbnb, VRBO, Outdoorsy) so they can import your CampervansRental availability.
            </p>
            {exportUrlStatus === 'loading' && (
              <p className="inline-flex items-center gap-2 text-xs text-neutral-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                Loading export link…
              </p>
            )}
            {exportUrlStatus === 'unavailable' && (
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Export link unavailable. Your server admin must set{' '}
                <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[10px]">CALENDAR_EXPORT_SECRET</code>
                {' '}in environment variables (and{' '}
                <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[10px]">NEXT_PUBLIC_SITE_URL</code>
                {' '}for production). Then reload this page.
              </p>
            )}
            {exportUrlStatus === 'ready' && exportUrl && (
              <div className="flex items-center gap-2">
                <input
                  ref={urlRef}
                  readOnly
                  value={exportUrl}
                  className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyExport}
                  title="Copy URL"
                  className="shrink-0 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
                >
                  {copiedExport ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={exportUrl}
                  download
                  title="Download .ics"
                  className="shrink-0 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
