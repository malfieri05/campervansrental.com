'use client'

import { useState, useTransition, useEffect } from 'react'
import { ChevronDown, Trash2, PlusCircle } from 'lucide-react'
import { format } from 'date-fns'
import ListingCalendar from '@/components/listing/ListingCalendar'
import type { BlockRange } from '@/lib/availability'
import { addHostAvailabilityBlock, removeHostAvailabilityBlock } from '@/app/host/listings/actions'
import { createClient } from '@/lib/supabase/client'

type HostListing = {
  id: string
  title: string
  slug: string
}

type Props = {
  listings: HostListing[]
  initialListingId: string | null
  initialBlocks: BlockRange[]
}

function formatDateDisplay(d: string) {
  return format(new Date(d + 'T12:00:00'), 'MMM d, yyyy')
}

export default function HostCalendarClient({ listings, initialListingId, initialBlocks }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialListingId)
  const [blocks, setBlocks] = useState<BlockRange[]>(initialBlocks)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loadingBlocks, setLoadingBlocks] = useState(false)

  const selectedListing = listings.find((l) => l.id === selectedId) ?? null

  // When the selected listing changes, reload blocks via client Supabase
  useEffect(() => {
    if (!selectedId || selectedId === initialListingId) {
      if (selectedId === initialListingId) setBlocks(initialBlocks)
      return
    }
    setLoadingBlocks(true)
    const supabase = createClient()
    supabase
      .from('availability_blocks')
      .select('start_date, end_date, block_type')
      .eq('listing_id', selectedId)
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setBlocks(
          (data ?? []).map((row) => ({
            start: row.start_date as string,
            end: row.end_date as string,
            type: row.block_type as BlockRange['type'],
          }))
        )
        setLoadingBlocks(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const hostBlocks = blocks.filter((b) => b.type === 'host_blocked')
  const reservationBlocks = blocks.filter((b) => b.type === 'confirmed_reservation')

  const handleAddBlock = (start: string, endExclusive: string) => {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const result = await addHostAvailabilityBlock(selectedId, start, endExclusive)
      if (!result.ok) {
        setError(result.error ?? 'Could not add block')
        return
      }
      setBlocks((prev) => [...prev, { start, end: endExclusive, type: 'host_blocked' }])
    })
  }

  const handleRemoveBlock = (block: BlockRange) => {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      // Find the block ID from Supabase for removal
      const supabase = createClient()
      const { data } = await supabase
        .from('availability_blocks')
        .select('id')
        .eq('listing_id', selectedId)
        .eq('start_date', block.start)
        .eq('end_date', block.end)
        .eq('block_type', 'host_blocked')
        .single()

      if (!data?.id) {
        setError('Could not find block to remove.')
        return
      }

      const result = await removeHostAvailabilityBlock(data.id, selectedId)
      if (!result.ok) {
        setError(result.error ?? 'Could not remove block')
        return
      }
      setBlocks((prev) => prev.filter((b) => !(b.start === block.start && b.end === block.end && b.type === 'host_blocked')))
    })
  }

  if (listings.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-neutral-500">You have no listings yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-neutral-900">Calendar</h1>

        {/* Listing selector */}
        {listings.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 transition-colors"
            >
              <span className="truncate max-w-[200px]">{selectedListing?.title ?? 'Select listing'}</span>
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-neutral-200 bg-white py-2 shadow-lg z-20">
                {listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(l.id)
                      setDropdownOpen(false)
                    }}
                    className={[
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      l.id === selectedId
                        ? 'bg-neutral-100 font-semibold text-neutral-900'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {selectedId ? (
        <div className="space-y-8">
          {/* Calendar */}
          <div className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${loadingBlocks || isPending ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="mb-4 text-sm text-neutral-500">
              Tap a check-in day, then a check-out day to block dates. Blocked dates will be unavailable for guests to book.
            </p>
            <ListingCalendar
              blocks={blocks}
              readOnly={false}
              onAddHostBlock={handleAddBlock}
            />
          </div>

          {/* Blocked periods */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <PlusCircle className="h-4 w-4 text-neutral-400" />
              <h2 className="font-sans text-sm font-bold text-neutral-900">Blocked periods</h2>
            </div>

            {hostBlocks.length === 0 ? (
              <p className="text-sm text-neutral-400">No blocked dates. Use the calendar above to block unavailable periods.</p>
            ) : (
              <ul className="space-y-2">
                {hostBlocks.map((block, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-700">
                      {formatDateDisplay(block.start)} – {formatDateDisplay(block.end)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(block)}
                      disabled={isPending}
                      className="ml-4 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      aria-label="Remove blocked period"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirmed reservations */}
          {reservationBlocks.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 font-sans text-sm font-bold text-neutral-900">Confirmed reservations</h2>
              <ul className="space-y-2">
                {reservationBlocks.map((block, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-forest-100 bg-forest-50/60 px-4 py-3">
                    <span className="text-sm font-medium text-forest-900">
                      {formatDateDisplay(block.start)} – {formatDateDisplay(block.end)}
                    </span>
                    <span className="text-xs font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full">Booked</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-neutral-500">Select a listing to manage its calendar.</p>
        </div>
      )}
    </div>
  )
}
