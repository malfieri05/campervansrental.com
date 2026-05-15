/**
 * Top-level "Vehicle Health" section rendered inline on the host dashboard.
 * Fetches the host's listings (lightweight query), then per-vehicle data is
 * streamed in independently via Suspense + VehicleHealthInline.
 */
import { Suspense } from 'react'
import Link from 'next/link'
import { Wrench, Plus } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import VehicleHealthInline, {
  type VehicleHealthInlineListing,
} from '@/components/host/VehicleHealthInline'

// ─── Skeleton for a single vehicle section ────────────────────────────────────

function VehicleSectionSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-44 bg-neutral-100 sm:h-56" />
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-3 py-4">
            <div className="mx-auto h-5 w-10 rounded bg-neutral-100" />
            <div className="mx-auto mt-2 h-3 w-16 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
      <div className="p-5 space-y-3">
        <div className="h-6 w-40 rounded bg-neutral-100" />
        <div className="h-32 rounded-xl bg-neutral-50" />
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default async function VehicleHealthSection() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, vehicle_year, vehicle_make, vehicle_model, listing_images(url)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (!listings || listings.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-12 text-center">
        <Wrench className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
        <h3 className="font-sans text-base font-bold text-neutral-900">No vehicles yet</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Create a listing to start tracking its health and maintenance here.
        </p>
        <Link
          href="/host/listings/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-900 px-4 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
        >
          <Plus className="h-4 w-4" />
          Add a vehicle
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {(listings as VehicleHealthInlineListing[]).map((listing) => (
        <Suspense key={listing.id} fallback={<VehicleSectionSkeleton />}>
          <VehicleHealthInline listing={listing} />
        </Suspense>
      ))}
    </div>
  )
}
