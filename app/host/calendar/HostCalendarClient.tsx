'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  HostListingMeta,
  CalendarReservation,
  ExternalFeed,
  BlockRow,
} from './page'
import HostCalendarSidebar, { type TripStatusFilter } from '@/components/host-calendar/HostCalendarSidebar'
import HostScheduleGrid from '@/components/host-calendar/HostScheduleGrid'
import UpdateAvailabilityModal from '@/components/host-calendar/UpdateAvailabilityModal'
import ReservationDetailModal from '@/components/host-calendar/ReservationDetailModal'
type Props = {
  listings: HostListingMeta[]
  initialListingId: string | null
  initialBlocks: BlockRow[]
  initialReservations: CalendarReservation[]
  initialFeeds: ExternalFeed[]
  exportToken: string | null
  siteUrl: string
}

export default function HostCalendarClient({
  listings,
  initialListingId,
  initialBlocks,
  initialReservations,
  initialFeeds,
  exportToken,
  siteUrl,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialListingId)
  const [blocks, setBlocks] = useState<BlockRow[]>(initialBlocks)
  const [reservations, setReservations] = useState<CalendarReservation[]>(initialReservations)
  const [feeds, setFeeds] = useState<ExternalFeed[]>(initialFeeds)
  const [loading, setLoading] = useState(false)
  const [availModalOpen, setAvailModalOpen] = useState(false)
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TripStatusFilter>({
    pending: true,
    confirmed_upcoming: true,
    currently_hosting: true,
    completed: false,
  })

  const selectedListing = listings.find((l) => l.id === selectedId) ?? null

  const exportUrl = selectedId && exportToken
    ? `${siteUrl}/api/host/calendar/export/${selectedId}?token=${exportToken}`
    : null

  const loadListingData = useCallback(async (listingId: string) => {
    setLoading(true)
    const supabase = createClient()
    const [blocksRes, resRes, feedsRes] = await Promise.all([
      supabase
        .from('availability_blocks')
        .select('start_date, end_date, block_type')
        .eq('listing_id', listingId)
        .order('start_date', { ascending: true }),
      supabase
        .from('reservations')
        .select('id, start_date, end_date, status, guest_first_name, guest_last_name')
        .eq('listing_id', listingId)
        .order('start_date', { ascending: true }),
      supabase
        .from('listing_external_calendars')
        .select('id, display_name, ical_url, last_synced_at, last_sync_error')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: true }),
    ])
    setBlocks((blocksRes.data ?? []) as BlockRow[])
    setReservations((resRes.data ?? []) as CalendarReservation[])
    setFeeds((feedsRes.data ?? []) as ExternalFeed[])
    setLoading(false)
  }, [])

  const handleSelectListing = (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    loadListingData(id)
  }

  const handleAvailabilityApplied = () => {
    if (selectedId) loadListingData(selectedId)
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-16 text-center shadow-sm max-w-sm w-full">
          <p className="text-sm text-neutral-500">You have no listings yet. Create a listing to manage its calendar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-neutral-50">
      <HostCalendarSidebar
        listings={listings}
        selectedId={selectedId}
        onSelectListing={handleSelectListing}
        filters={filters}
        onFiltersChange={setFilters}
        feeds={feeds}
        onFeedsChange={setFeeds}
        exportUrl={exportUrl}
        onOpenAvailability={() => setAvailModalOpen(true)}
      />

      {/* Main calendar area */}
      <main className={`flex-1 flex flex-col min-w-0 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {selectedId && selectedListing ? (
          <HostScheduleGrid
            blocks={blocks}
            reservations={reservations}
            filters={filters}
            pricePerNight={selectedListing.price_per_night_cents}
            onReservationClick={setSelectedReservationId}
            onOpenAvailability={() => setAvailModalOpen(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-400">Select a listing to view its calendar.</p>
          </div>
        )}
      </main>

      {availModalOpen && selectedId && (
        <UpdateAvailabilityModal
          listingId={selectedId}
          onClose={() => setAvailModalOpen(false)}
          onApplied={handleAvailabilityApplied}
        />
      )}

      {selectedReservationId && (
        <ReservationDetailModal
          reservationId={selectedReservationId}
          onClose={() => setSelectedReservationId(null)}
        />
      )}
    </div>
  )
}
