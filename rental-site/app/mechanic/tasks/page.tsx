import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench, MapPin, Clock, Gauge } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'Browse Maintenance Tasks | Mechanic' }

type PublicTask = {
  id: string
  listing_id: string
  kind: string
  title: string
  description: string | null
  priority: string
  due_at_date: string | null
  due_at_miles: number | null
  created_at: string
  listing_lat: number | null
  listing_lng: number | null
  location_label: string | null
  address_city: string | null
  address_state: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_class: string | null
}

function priorityColor(p: string) {
  const map: Record<string, string> = {
    low: 'bg-neutral-100 text-neutral-600',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-red-50 text-red-700',
  }
  return map[p] ?? map.medium
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default async function MechanicTasksPage() {
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
    .select('lat, lng, service_radius_miles, specialties')
    .eq('id', user.id)
    .maybeSingle()

  const { data: rawTasks } = await supabase
    .from('published_open_tasks')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  const tasks = (rawTasks ?? []) as PublicTask[]

  // Client-side radius filter when mechanic has lat/lng
  const filteredTasks =
    mechProfile?.lat && mechProfile?.lng
      ? tasks.filter((t) => {
          if (!t.listing_lat || !t.listing_lng) return true
          const dist = distanceMiles(
            mechProfile.lat!,
            mechProfile.lng!,
            t.listing_lat,
            t.listing_lng
          )
          return dist <= (mechProfile.service_radius_miles ?? 25)
        })
      : tasks

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <p className="mb-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-forest-700">
          Mechanic Partner
        </p>
        <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          Open Tasks Near You
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} within your service radius
          {mechProfile?.service_radius_miles ? ` (${mechProfile.service_radius_miles} mi)` : ''}
        </p>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-16 text-center">
          <Wrench className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
          <h3 className="font-sans text-lg font-bold text-neutral-900">No open tasks right now</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Check back soon — new requests come in daily as owners complete trips.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const vehicleLabel = [task.vehicle_year, task.vehicle_make, task.vehicle_model]
              .filter(Boolean)
              .join(' ')
            const location = task.address_city
              ? `${task.address_city}, ${task.address_state}`
              : task.location_label

            let distLabel: string | null = null
            if (mechProfile?.lat && mechProfile?.lng && task.listing_lat && task.listing_lng) {
              const d = distanceMiles(mechProfile.lat, mechProfile.lng, task.listing_lat, task.listing_lng)
              distLabel = `${d.toFixed(1)} mi away`
            }

            return (
              <Link
                key={task.id}
                href={`/mechanic/tasks/${task.id}`}
                className="group block rounded-2xl border border-neutral-200 bg-white p-5 hover:shadow-md hover:border-neutral-300 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <span className="text-xs text-neutral-500 capitalize">
                        {task.kind.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-sans text-base font-bold text-neutral-900 truncate">
                      {task.title}
                    </h3>
                    {vehicleLabel && (
                      <p className="text-sm text-neutral-500 truncate">{vehicleLabel}</p>
                    )}
                    {task.description && (
                      <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{task.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location}
                        </span>
                      )}
                      {distLabel && <span>{distLabel}</span>}
                      {task.due_at_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {new Date(task.due_at_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.due_at_miles && (
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {task.due_at_miles.toLocaleString()} mi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
