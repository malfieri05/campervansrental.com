/**
 * Integrated per-vehicle health section, rendered inline on the host dashboard.
 *
 * Each instance pulls all of the data the standalone detail page used to fetch
 * (profile, mileage, tasks, damages, unclaimed external trips, trip totals,
 * mechanic quotes) and renders:
 *   1. A compact vehicle "card" header (thumbnail + title + health pill)
 *   2. The full HealthDetailClient (tabs: Overview / Mileage / Maintenance /
 *      Damage / Quotes) directly underneath
 * — all as a single visual unit. Multiple vehicles stack.
 */
import Image from 'next/image'
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getVehicleProfile,
  seedDefaultIntervals,
  summarizeVehicleHealth,
} from '@/lib/vehicle-health'
import type {
  VehicleMileageLog,
  VehicleMaintenanceTask,
  VehicleDamageReport,
  VehicleHealthSummary,
} from '@/lib/vehicle-health'
import {
  getUnclaimedExternalBlocks,
  getTotalTripCount,
} from '@/lib/vehicle-health-external'
import HealthDetailClient from '@/app/host/health/[listingId]/HealthDetailClient'
import type { MechanicQuote } from '@/app/host/health/[listingId]/HealthDetailClient'

export type VehicleHealthInlineListing = {
  id: string
  title: string
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  listing_images: { url: string }[]
}

// ─── Health pill ──────────────────────────────────────────────────────────────

function HealthPill({ level }: { level: VehicleHealthSummary['healthLevel'] }) {
  const map = {
    good: {
      label: 'Good',
      Icon: ShieldCheck,
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    attention: {
      label: 'Needs attention',
      Icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    urgent: {
      label: 'Urgent',
      Icon: AlertCircle,
      className: 'bg-red-50 text-red-700 border border-red-200',
    },
  }
  const { label, Icon, className } = map[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default async function VehicleHealthInline({
  listing,
}: {
  listing: VehicleHealthInlineListing
}) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  // Parallelise everything needed for both the card header and the detail UI.
  const [
    profile,
    logs,
    tasks,
    damages,
    ,
    unclaimedBlocks,
    totalTrips,
    quotes,
    summary,
  ] = await Promise.all([
    getVehicleProfile(listing.id),
    supabase
      .from('vehicle_mileage_logs')
      .select('*')
      .eq('listing_id', listing.id)
      .order('trip_end_date', { ascending: false })
      .limit(50)
      .then((r) => (r.data ?? []) as VehicleMileageLog[]),
    supabase
      .from('vehicle_maintenance_tasks')
      .select('*')
      .eq('listing_id', listing.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .then((r) => (r.data ?? []) as VehicleMaintenanceTask[]),
    supabase
      .from('vehicle_damage_reports')
      .select('*')
      .eq('listing_id', listing.id)
      .order('discovered_at', { ascending: false })
      .then((r) => (r.data ?? []) as VehicleDamageReport[]),
    seedDefaultIntervals(listing.id), // void — discarded in destructure
    getUnclaimedExternalBlocks(listing.id),
    getTotalTripCount(listing.id),
    fetchQuotes(supabase, listing.id),
    summarizeVehicleHealth(listing.id),
  ])

  const newQuoteCount = quotes.filter((q) => q.status === 'pending').length
  const thumb = listing.listing_images?.[0]?.url ?? null
  const vehicleLabel =
    [listing.vehicle_year, listing.vehicle_make, listing.vehicle_model]
      .filter(Boolean)
      .join(' ') || null

  return (
    <section id={`vehicle-${listing.id}`} className="scroll-mt-24">
      {/* ─── Compact card header (its own card) ───────────────────────────── */}
      <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:items-center sm:p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-20 sm:w-20">
          {thumb ? (
            <Image src={thumb} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[0.65rem] font-medium text-neutral-400">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base font-bold leading-snug text-neutral-900 sm:text-lg line-clamp-2">
            {listing.title}
          </h3>
          {vehicleLabel && (
            <p className="mt-0.5 text-sm text-neutral-500 truncate">{vehicleLabel}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <HealthPill level={summary.healthLevel} />
            {newQuoteCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <MessageSquare className="h-3 w-3" />
                {newQuoteCount} new quote{newQuoteCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Dashboard cards (each renders its own card frame) ────────────── */}
      <HealthDetailClient
        listingId={listing.id}
        profile={profile}
        mileageLogs={logs}
        tasks={tasks}
        damages={damages}
        unclaimedExternalBlocks={unclaimedBlocks}
        totalTripCount={totalTrips}
        quotes={quotes}
      />
    </section>
  )
}

// ─── Helper — quotes query that tolerates pre-migration databases ────────────

async function fetchQuotes(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  listingId: string
): Promise<MechanicQuote[]> {
  try {
    const { data } = await supabase
      .from('mechanic_quotes')
      .select('*, mechanic_profiles(display_name, business_name, is_verified, avg_rating)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
    return (data ?? []) as MechanicQuote[]
  } catch {
    // mechanic_quotes table doesn't exist yet (migration 00019 not applied).
    return []
  }
}
