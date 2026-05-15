import dynamic from 'next/dynamic'
import Link from 'next/link'
import { CalendarRange, User, ArrowUpRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import type { HostBookingCounts } from './BookingsStatusTabs'

// Defer framer-motion tab bar and host respond buttons (fetched server-side data arrives first).
const BookingsStatusTabs = dynamic(() => import('./BookingsStatusTabs'), { ssr: false })
const HostBookingRespondButtons = dynamic(
  () => import('@/components/host/bookings/HostBookingRespondButtons'),
  { ssr: false }
)

type StatusParam = 'pending' | 'confirmed' | 'completed' | 'cancelled'

type ReservationRow = {
  id: string
  start_date: string
  end_date: string
  guests: number
  status: string
  total_cents: number
  guest_first_name: string | null
  guest_last_name: string | null
  guest_email: string | null
  listing: {
    id: string
    title: string
    slug: string
  } | null
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    cents / 100
  )
}

function formatDate(d: string) {
  return format(new Date(d + 'T12:00:00'), 'MMM d, yyyy')
}

function statusLabel(status: StatusParam) {
  const map: Record<StatusParam, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status
}

function statusBadge(status: StatusParam) {
  const styles: Record<StatusParam, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    cancelled: 'bg-red-50 text-red-600 border border-red-200',
  }
  return styles[status] ?? 'bg-neutral-100 text-neutral-500 border border-neutral-200'
}

/** Pending tab mixes DB rows — badge from reservation.status */
function pendingRowBadge(dbStatus: string): { label: string; badgeClass: string } {
  if (dbStatus === 'pending_host') {
    return {
      label: 'Awaiting your approval',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300',
    }
  }
  return {
    label: 'Awaiting payment',
    badgeClass: 'bg-slate-50 text-slate-600 border border-slate-200',
  }
}

const VALID_STATUSES: StatusParam[] = ['pending', 'confirmed', 'completed', 'cancelled']

export default async function HostBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const rawStatus = (searchParams.status ?? 'confirmed') as StatusParam
  const activeStatus: StatusParam = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'confirmed'

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

  // Build db status filter from UI status
  let dbStatus: string
  let endDateFilter: { lt?: string; gte?: string } | null = null

  if (activeStatus === 'pending') {
    dbStatus = 'pending_payment' // unused for query; pending tab uses .in()
  } else if (activeStatus === 'confirmed') {
    dbStatus = 'confirmed'
    endDateFilter = { gte: today }
  } else if (activeStatus === 'completed') {
    dbStatus = 'confirmed'
    endDateFilter = { lt: today }
  } else {
    dbStatus = 'cancelled'
  }

  // First get the host's listing IDs
  const { data: listingIds } = await supabase
    .from('listings')
    .select('id')
    .eq('owner_id', user.id)

  const ids = (listingIds ?? []).map((l) => l.id)

  let counts: HostBookingCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }

  let reservations: ReservationRow[] = []

  if (ids.length > 0) {
    const counting = () =>
      supabase.from('reservations').select('*', { count: 'exact', head: true }).in('listing_id', ids)

    const [pRes, cfRes, compRes, canRes] = await Promise.all([
      counting().in('status', ['pending_payment', 'pending_host']),
      counting().eq('status', 'confirmed').gte('end_date', today),
      counting().eq('status', 'confirmed').lt('end_date', today),
      counting().eq('status', 'cancelled'),
    ])

    counts = {
      pending: pRes.count ?? 0,
      confirmed: cfRes.count ?? 0,
      completed: compRes.count ?? 0,
      cancelled: canRes.count ?? 0,
    }

    let query = supabase
      .from('reservations')
      .select(
        `
        id,
        start_date,
        end_date,
        guests,
        status,
        total_cents,
        guest_first_name,
        guest_last_name,
        guest_email,
        listing:listing_id ( id, title, slug )
      `
      )
      .in('listing_id', ids)

    if (activeStatus === 'pending') {
      query = query.in('status', ['pending_payment', 'pending_host'])
    } else {
      query = query.eq('status', dbStatus)
      if (endDateFilter?.gte) {
        query = query.gte('end_date', endDateFilter.gte)
      }
      if (endDateFilter?.lt) {
        query = query.lt('end_date', endDateFilter.lt)
      }
    }

    if (activeStatus === 'confirmed') {
      // Upcoming bookings should read chronologically (nearest first).
      query = query.order('start_date', { ascending: true })
    } else if (activeStatus === 'completed') {
      // Completed bookings should show the most recently finished first.
      query = query.order('end_date', { ascending: false })
    } else {
      query = query.order('start_date', { ascending: false })
    }

    const { data } = await query
    reservations = (data ?? []) as unknown as ReservationRow[]
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-neutral-900">Bookings</h1>
      </div>

      <BookingsStatusTabs activeStatus={activeStatus} counts={counts} />

      {/* Booking list */}
      {reservations.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-neutral-500">No {statusLabel(activeStatus).toLowerCase()} bookings yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reservations.map((r) => {
            const guestName = [r.guest_first_name, r.guest_last_name].filter(Boolean).join(' ') || r.guest_email || 'Guest'
            const nights = Math.max(
              1,
              Math.round(
                (new Date(r.end_date + 'T12:00:00').getTime() -
                  new Date(r.start_date + 'T12:00:00').getTime()) /
                  86400000
              )
            )

            const rowBadge =
              activeStatus === 'pending'
                ? pendingRowBadge(r.status)
                : { label: statusLabel(activeStatus), badgeClass: statusBadge(activeStatus) }

            return (
              <li
                key={r.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rowBadge.badgeClass}`}
                      >
                        {rowBadge.label}
                      </span>
                      {r.listing && (
                        <span className="text-sm font-semibold text-neutral-800 truncate">
                          {r.listing.title}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-x-10">
                      <div className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                        <div>
                          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">Guest</p>
                          <p className="mt-0.5 text-sm font-semibold text-neutral-800">{guestName}</p>
                          {r.guest_email && (
                            <p className="text-xs text-neutral-400 truncate">{r.guest_email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                        <div>
                          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">Dates</p>
                          <p className="mt-0.5 text-sm font-semibold text-neutral-800 whitespace-nowrap">
                            {formatDate(r.start_date)} – {formatDate(r.end_date)}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {nights} {nights === 1 ? 'night' : 'nights'} · {r.guests}{' '}
                            {r.guests === 1 ? 'guest' : 'guests'}
                          </p>
                        </div>
                      </div>
                      <div className="sm:justify-self-end">
                        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">Total</p>
                        <p className="mt-0.5 text-sm font-semibold text-neutral-800">
                          {formatMoney(r.total_cents)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {r.listing && (
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/listings/${r.listing.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900"
                      >
                        View listing
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
                {(r.status === 'pending_host' || r.status === 'pending_payment') && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    {r.status === 'pending_payment' && (
                      <p className="text-xs text-neutral-500 mb-3 leading-snug max-w-xl">
                        <span className="font-medium text-neutral-700">Accept</span> is available once the guest&apos;s
                        reservation fee shows as paid in Stripe (usually immediately after checkout). If they abandoned
                        checkout, only &quot;waiting for payment&quot; applies — Decline frees the dates for other guests
                        without a refund.
                      </p>
                    )}
                    <div className="flex justify-end">
                      <HostBookingRespondButtons reservationId={r.id} dbStatus={r.status} />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
