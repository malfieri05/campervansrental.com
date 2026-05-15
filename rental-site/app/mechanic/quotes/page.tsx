import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'My Quotes | Mechanic' }

type Quote = {
  id: string
  task_id: string
  amount_cents: number
  status: string
  estimated_duration_hours: number | null
  earliest_available_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  declined: 'bg-neutral-100 text-neutral-500',
  withdrawn: 'bg-neutral-100 text-neutral-500',
  expired: 'bg-neutral-100 text-neutral-400',
}

export default async function MechanicQuotesPage() {
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

  const { data: quotes } = await supabase
    .from('mechanic_quotes')
    .select('*')
    .eq('mechanic_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <p className="mb-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-forest-700">
          Mechanic Partner
        </p>
        <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          My Quotes
        </h1>
      </div>

      {!quotes || quotes.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-16 text-center">
          <p className="text-sm text-neutral-500">No quotes submitted yet.</p>
          <Link href="/mechanic/tasks" className="mt-4 inline-block text-sm font-semibold text-neutral-900 underline">
            Browse open tasks
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(quotes as Quote[]).map((q) => (
            <Link
              key={q.id}
              href={`/mechanic/tasks/${q.task_id}`}
              className="group block rounded-2xl border border-neutral-200 bg-white p-5 hover:shadow-md hover:border-neutral-300 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-base font-bold text-neutral-900">
                    ${(q.amount_cents / 100).toFixed(0)}
                    {q.estimated_duration_hours && (
                      <span className="ml-2 text-sm font-normal text-neutral-500">
                        · {q.estimated_duration_hours}h est.
                      </span>
                    )}
                  </p>
                  {q.earliest_available_date && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Available from {new Date(q.earliest_available_date).toLocaleDateString()}
                    </p>
                  )}
                  {q.notes && (
                    <p className="mt-2 text-sm text-neutral-600 line-clamp-2">{q.notes}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-400">
                    Submitted {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[q.status] ?? STATUS_COLORS.pending}`}>
                  {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
