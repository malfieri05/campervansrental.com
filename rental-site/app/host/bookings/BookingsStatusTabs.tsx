'use client'

import Link from 'next/link'
import { LayoutGroup, motion } from 'framer-motion'

export type BookingsStatusParam = 'pending' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_TABS: { label: string; status: BookingsStatusParam }[] = [
  { label: 'Pending', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled' },
]

export default function BookingsStatusTabs({ activeStatus }: { activeStatus: BookingsStatusParam }) {
  return (
    <LayoutGroup id="host-bookings-status">
      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm w-fit">
        {STATUS_TABS.map(({ label, status }) => {
          const active = activeStatus === status
          return (
            <Link
              key={status}
              href={`/host/bookings?status=${status}`}
              scroll={false}
              className={[
                'relative rounded-lg px-4 py-2 text-sm font-medium outline-none transition-colors duration-200',
                'ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-400',
                active ? 'text-white' : 'text-neutral-600 hover:bg-neutral-100',
              ].join(' ')}
            >
              {active && (
                <motion.span
                  layoutId="bookings-status-pill"
                  className="absolute inset-0 z-0 block rounded-lg bg-neutral-900 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
