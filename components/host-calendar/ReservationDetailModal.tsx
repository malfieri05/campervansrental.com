'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, MapPin, Calendar, DollarSign, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { ProfileInitialsContent } from '@/components/ui/ProfileInitialsContent'

type ReservationDetail = {
  id: string
  status: string
  start_date: string
  end_date: string
  total_cents: number
  guests: number
  guest_first_name: string | null
  guest_last_name: string | null
  guest_email: string | null
  guest_phone: string | null
  pickup_location: string | null
  listing: {
    title: string
    slug: string
    location_label: string | null
  } | null
}

type Props = {
  reservationId: string
  onClose: () => void
}

const STATUS_STYLES: Record<string, string> = {
  confirmed:       'bg-emerald-100 text-emerald-800',
  pending_payment: 'bg-amber-100 text-amber-800',
  pending_host: 'bg-amber-100 text-amber-800',
  cancelled:       'bg-neutral-100 text-neutral-500',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed:       'Confirmed',
  pending_payment: 'Pending',
  pending_host: 'Awaiting approval',
  cancelled:       'Cancelled',
}

function initials(first?: string | null, last?: string | null) {
  return [(first ?? '').charAt(0), (last ?? '').charAt(0)].join('').toUpperCase()
}

function fmtDate(d: string) {
  return format(parseISO(d + 'T12:00:00'), 'EEE, MMM d')
}

function fmtDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ReservationDetailModal({ reservationId, onClose }: Props) {
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reservations')
      .select(`
        id, status, start_date, end_date, total_cents, guests,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        pickup_location,
        listings (title, slug, location_label)
      `)
      .eq('id', reservationId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setError(err?.message ?? 'Not found'); setLoading(false); return }
        const listingRaw = Array.isArray(data.listings) ? data.listings[0] : data.listings
        setDetail({
          ...(data as Omit<typeof data, 'listings'>),
          listing: listingRaw as ReservationDetail['listing'] ?? null,
        } as ReservationDetail)
        setLoading(false)
      })
  }, [reservationId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200 overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}

        {error && (
          <div className="px-6 py-10 text-center text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && detail && (
          <div className="divide-y divide-neutral-100">
            {/* Status + listing */}
            <div className="px-6 pt-6 pb-4">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3 ${STATUS_STYLES[detail.status] ?? STATUS_STYLES.cancelled}`}>
                {STATUS_LABELS[detail.status] ?? detail.status}
              </span>
              <h2 className="text-sm font-bold text-neutral-900 leading-snug pr-8">
                {detail.listing?.title ?? 'Listing'}
              </h2>
            </div>

            {/* Guest */}
            <div className="px-6 py-4 flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 grid-cols-1 grid-rows-1 overflow-hidden rounded-full bg-neutral-800">
                <ProfileInitialsContent
                  initials={initials(detail.guest_first_name, detail.guest_last_name)}
                  textClassName="font-sans text-white"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {[detail.guest_first_name, detail.guest_last_name].filter(Boolean).join(' ') || 'Guest'}
                </p>
                {detail.guest_email && (
                  <p className="text-xs text-neutral-400">{detail.guest_email}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Starts</p>
                <p className="text-sm font-semibold text-neutral-900">{fmtDate(detail.start_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Ends</p>
                <p className="text-sm font-semibold text-neutral-900">{fmtDate(detail.end_date)}</p>
              </div>
            </div>

            {/* Location */}
            {(detail.pickup_location || detail.listing?.location_label) && (
              <div className="px-6 py-4 space-y-2">
                {detail.pickup_location && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Guest picks up at</p>
                    <p className="text-sm text-neutral-700">{detail.pickup_location}</p>
                  </div>
                )}
                {!detail.pickup_location && detail.listing?.location_label && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Location</p>
                    <p className="text-sm text-neutral-700">{detail.listing.location_label}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payout + Booking ID */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Total payout</p>
                <p className="text-sm font-bold text-neutral-900">{fmtDollars(detail.total_cents)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Booking ID</p>
                <p className="text-sm font-mono text-neutral-600 truncate">{detail.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex gap-3">
              <Link
                href={`/host/bookings`}
                className="flex-1 rounded-xl border border-neutral-300 bg-white py-2.5 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View booking
              </Link>
              {detail.guest_email && (
                <a
                  href={`mailto:${detail.guest_email}`}
                  className="flex-1 rounded-xl border border-neutral-300 bg-white py-2.5 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
                >
                  Message guest
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
