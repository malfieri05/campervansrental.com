import Link from 'next/link'
import { CalendarRange, User, ArrowUpRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

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

const STATUS_TABS: { label: string; status: StatusParam }[] = [
  { label: 'Pending', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled' },
]

export default async function HostBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const rawStatus = (searchParams.status ?? 'confirmed') as StatusParam
  const activeStatus: StatusParam = STATUS_TABS.some((t) => t.status === rawStatus) ? rawStatus : 'confirmed'

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
    dbStatus = 'pending_payment'
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

  let reservations: ReservationRow[] = []

  if (ids.length > 0) {
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
      .eq('status', dbStatus)
      .order('start_date', { ascending: false })

    if (endDateFilter?.gte) {
      query = query.gte('end_date', endDateFilter.gte)
    }
    if (endDateFilter?.lt) {
      query = query.lt('end_date', endDateFilter.lt)
    }

    const { data } = await query
    reservations = (data ?? []) as unknown as ReservationRow[]
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-neutral-900">Bookings</h1>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm w-fit">
        {STATUS_TABS.map(({ label, status }) => (
          <Link
            key={status}
            href={`/host/bookings?status=${status}`}
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeStatus === status
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>

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

            return (
              <li
                key={r.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(activeStatus)}`}
                      >
                        {statusLabel(activeStatus)}
                      </span>
                      {r.listing && (
                        <span className="text-sm font-semibold text-neutral-800 truncate">
                          {r.listing.title}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                          <p className="mt-0.5 text-sm font-semibold text-neutral-800">
                            {formatDate(r.start_date)} – {formatDate(r.end_date)}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {nights} {nights === 1 ? 'night' : 'nights'} · {r.guests}{' '}
                            {r.guests === 1 ? 'guest' : 'guests'}
                          </p>
                        </div>
                      </div>
                      <div>
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
