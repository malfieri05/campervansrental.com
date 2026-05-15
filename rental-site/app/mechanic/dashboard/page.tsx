import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench, MessageSquare, Star, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'Mechanic Dashboard' }

export default async function MechanicDashboardPage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/auth/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_mechanic')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_mechanic) redirect('/mechanic/signup')

  const { data: mechProfile } = await supabase
    .from('mechanic_profiles')
    .select('display_name, business_name, service_radius_miles, address_city, address_state, is_verified, avg_rating, quotes_sent_count, quotes_accepted_count')
    .eq('id', user.id)
    .maybeSingle()

  const [tasksResult, pendingQuotesResult, acceptedQuotesResult, messagesResult] = await Promise.all([
    supabase
      .from('published_open_tasks')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('mechanic_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('mechanic_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('mechanic_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('mechanic_id', user.id)
      .eq('status', 'accepted'),
    supabase
      .from('mechanic_task_messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .in(
        'task_id',
        await supabase
          .from('mechanic_quotes')
          .select('task_id')
          .eq('mechanic_id', user.id)
          .then((r) => r.data?.map((q: { task_id: string }) => q.task_id) ?? [])
      ),
  ])

  const stats = [
    { label: 'Open tasks near you', value: tasksResult.count ?? 0, icon: Wrench, href: '/mechanic/tasks' },
    { label: 'Pending quotes', value: pendingQuotesResult.count ?? 0, icon: Star, href: '/mechanic/quotes' },
    { label: 'Accepted quotes', value: acceptedQuotesResult.count ?? 0, icon: CheckCircle2, href: '/mechanic/quotes' },
    { label: 'New messages', value: messagesResult.count ?? 0, icon: MessageSquare, href: '/mechanic/quotes' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <p className="mb-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-forest-700">
          Mechanic Partner
        </p>
        <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          {mechProfile?.business_name || mechProfile?.display_name || 'My Dashboard'}
        </h1>
        {mechProfile?.address_city && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="h-3.5 w-3.5" />
            {mechProfile.address_city}, {mechProfile.address_state} · {mechProfile.service_radius_miles} mi radius
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 hover:shadow-md hover:border-neutral-300 transition"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 group-hover:bg-forest-50 transition">
              <Icon className="h-4 w-4 text-neutral-600 group-hover:text-forest-700" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/mechanic/tasks"
          className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-6 hover:shadow-md transition"
        >
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-900">Browse Tasks</h3>
            <p className="mt-1 text-sm text-neutral-500">Find maintenance jobs near you.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/mechanic/quotes"
          className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-6 hover:shadow-md transition"
        >
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-900">My Quotes</h3>
            <p className="mt-1 text-sm text-neutral-500">Track your submitted bids.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/mechanic/profile"
          className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-6 hover:shadow-md transition"
        >
          <div>
            <h3 className="font-sans text-base font-bold text-neutral-900">My Profile</h3>
            <p className="mt-1 text-sm text-neutral-500">Edit specialties, radius, and info.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
