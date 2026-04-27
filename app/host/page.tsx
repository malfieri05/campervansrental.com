import Link from 'next/link'
import { CalendarDays, BookOpen, LayoutList, ArrowRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function HostHomePage() {
  const supabase = await createServerSupabaseClient()
  const displayName = (() => {
    // best-effort; not critical if it fails
    return null
  })()

  let firstName: string | null = null
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      firstName = profile?.display_name?.split(' ')[0] ?? null
    }
  }

  const cards = [
    {
      icon: LayoutList,
      title: 'My listings',
      description: 'Manage your vehicles, pricing, photos, and availability.',
      href: '/host/listings',
      cta: 'View listings',
    },
    {
      icon: CalendarDays,
      title: 'Calendar',
      description: 'Block dates, review booked periods, and stay on top of availability.',
      href: '/host/calendar',
      cta: 'Open calendar',
    },
    {
      icon: BookOpen,
      title: 'Bookings',
      description: 'Track pending, confirmed, completed, and cancelled reservations.',
      href: '/host/bookings?status=confirmed',
      cta: 'View bookings',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-neutral-900">
          {firstName ? `Welcome back, ${firstName}` : 'Host dashboard'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Manage your listings, calendar, and bookings from one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map(({ icon: Icon, title, description, href, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-neutral-300"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 group-hover:bg-gold-50 transition-colors">
              <Icon className="h-5 w-5 text-neutral-700 group-hover:text-gold-600 transition-colors" strokeWidth={1.5} />
            </div>
            <h2 className="font-sans text-base font-bold text-neutral-900">{title}</h2>
            <p className="mt-1.5 text-sm text-neutral-500 flex-1">{description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 group-hover:text-gold-700 transition-colors">
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-sans text-base font-bold text-neutral-900">Ready to add a new vehicle?</h2>
            <p className="mt-1 text-sm text-neutral-500">List another camper van and grow your rental income.</p>
          </div>
          <Link
            href="/host/listings/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-neutral-900 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Add an RV
          </Link>
        </div>
      </div>
    </div>
  )
}
