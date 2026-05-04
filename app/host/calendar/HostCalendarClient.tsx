'use client'

import { useState, useCallback, useEffect } from 'react'
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
  /** Pre-fill modal when opened from a calendar day */
  const [availabilityPreset, setAvailabilityPreset] = useState<{ from: string; to: string } | null>(null)
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [availabilityBanner, setAvailabilityBanner] = useState<string | null>(null)
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

  const openAvailabilitySidebar = () => {
    setAvailabilityPreset(null)
    setAvailModalOpen(true)
  }

  const openAvailabilityForDay = (isoDate: string) => {
    setAvailabilityPreset({ from: isoDate, to: isoDate })
    setAvailModalOpen(true)
  }

  const closeAvailabilityModal = () => {
    setAvailModalOpen(false)
    setAvailabilityPreset(null)
  }

  const handleAvailabilityApplied = () => {
    if (selectedId) void loadListingData(selectedId)
    setAvailabilityBanner('Availability updated.')
  }

  useEffect(() => {
    if (!availabilityBanner) return
    const t = window.setTimeout(() => setAvailabilityBanner(null), 5000)
    return () => window.clearTimeout(t)
  }, [availabilityBanner])

  if (listings.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-cream-100 px-3 py-3 sm:px-6 sm:py-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
          <div className="flex min-h-0 flex-1 items-center justify-center p-8">
            <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-neutral-50/80 px-8 py-16 text-center">
              <p className="text-sm text-neutral-500">You have no listings yet. Create a listing to manage its calendar.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-cream-100 px-3 py-3 sm:px-6 sm:py-6">
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm lg:flex-row">
          <HostCalendarSidebar
            listings={listings}
            selectedId={selectedId}
            onSelectListing={handleSelectListing}
            filters={filters}
            onFiltersChange={setFilters}
            feeds={feeds}
            onFeedsChange={setFeeds}
            exportUrl={exportUrl}
            onOpenAvailability={openAvailabilitySidebar}
          />

          {/* Main calendar — only grid scrolls */}
          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white transition-opacity ${
              loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
            }`}
          >
            {availabilityBanner && (
              <div
                className="sticky top-0 z-30 shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-900"
                role="status"
              >
                {availabilityBanner}
              </div>
            )}
            {selectedId && selectedListing ? (
              <HostScheduleGrid
                blocks={blocks}
                reservations={reservations}
                filters={filters}
                pricePerNight={selectedListing.price_per_night_cents}
                onReservationClick={setSelectedReservationId}
                onDayClick={openAvailabilityForDay}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6">
                <p className="text-sm text-neutral-400">Select a listing to view its calendar.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {availModalOpen && selectedId && (
        <UpdateAvailabilityModal
          listingId={selectedId}
          pricePerNight={selectedListing?.price_per_night_cents ?? null}
          initialFrom={availabilityPreset?.from}
          initialTo={availabilityPreset?.to}
          onClose={closeAvailabilityModal}
          onApplied={handleAvailabilityApplied}
        />
      )}

      {selectedReservationId && (
        <ReservationDetailModal
          reservationId={selectedReservationId}
          onClose={() => setSelectedReservationId(null)}
        />
      )}
    </>
  )
}
