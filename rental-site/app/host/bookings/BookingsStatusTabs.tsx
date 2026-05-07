'use client'

import Link from 'next/link'
import { LayoutGroup, motion } from 'framer-motion'

export type BookingsStatusParam = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type HostBookingCounts = {
  pending: number
  confirmed: number
  completed: number
  cancelled: number
}

const STATUS_TABS: { label: string; status: BookingsStatusParam }[] = [
  { label: 'Pending', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled' },
]

export default function BookingsStatusTabs({
  activeStatus,
  counts,
}: {
  activeStatus: BookingsStatusParam
  counts: HostBookingCounts
}) {
  return (
    <LayoutGroup id="host-bookings-status">
      <div className="mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-px">
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm w-fit min-w-max">
        {STATUS_TABS.map(({ label, status }) => {
          const active = activeStatus === status
          const n = counts[status]
          return (
            <Link
              key={status}
              href={`/host/bookings?status=${status}`}
              scroll={false}
              className={[
                'relative rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors duration-200',
                'ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-400',
                active ? 'text-yellow-600' : 'text-neutral-600 hover:bg-neutral-100',
              ].join(' ')}
            >
              {active && (
                <motion.span
                  layoutId="bookings-status-pill"
                  aria-hidden
                  className="absolute inset-0 z-0 block rounded-full border-2 border-yellow-500 bg-transparent"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative z-10">
                {label}{' '}
                <span className={active ? 'text-yellow-600 tabular-nums' : 'text-neutral-400 tabular-nums'}>({n})</span>
              </span>
            </Link>
          )
        })}
      </div>
      </div>
    </LayoutGroup>
  )
}
