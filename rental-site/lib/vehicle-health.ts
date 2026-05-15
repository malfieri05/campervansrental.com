/**
 * Server-only utility module for Vehicle Health & Maintenance Hub (Phase 1+).
 * All functions require a valid Supabase session client so they enforce RLS.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaintenanceKind =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_inspection'
  | 'transmission_fluid'
  | 'air_filter'
  | 'coolant_flush'
  | 'inspection'
  | 'custom'

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'deferred' | 'cancelled'
export type MileageSource = 'platform' | 'external_calendar' | 'manual'
export type DamageSeverity = 'minor' | 'moderate' | 'major' | 'totaled'
export type DamageCategory = 'exterior' | 'interior' | 'mechanical' | 'electrical' | 'tires' | 'glass' | 'other'
export type DamageRepairStatus = 'unresolved' | 'in_progress' | 'repaired' | 'deferred'

export type VehicleProfile = {
  listing_id: string
  host_id: string
  current_odometer_miles: number | null
  current_odometer_updated_at: string | null
  purchased_at: string | null
  vin_last_4: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type VehicleMileageLog = {
  id: string
  listing_id: string
  host_id: string
  reservation_id: string | null
  external_block_id: string | null
  source: MileageSource
  start_odometer: number | null
  end_odometer: number | null
  miles_driven: number | null
  /** When odometer start/end are unknown, host-entered miles for external trips. */
  host_reported_trip_miles: number | null
  trip_start_date: string | null
  trip_end_date: string | null
  recorded_by: string | null
  notes: string | null
  created_at: string
}

export type VehicleMaintenanceInterval = {
  id: string
  listing_id: string
  host_id: string
  kind: MaintenanceKind
  label: string
  every_miles: number | null
  every_days: number | null
  last_completed_miles: number | null
  last_completed_at: string | null
  enabled: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type VehicleMaintenanceTask = {
  id: string
  listing_id: string
  host_id: string
  interval_id: string | null
  kind: MaintenanceKind
  title: string
  description: string | null
  priority: MaintenancePriority
  status: MaintenanceStatus
  due_at_miles: number | null
  due_at_date: string | null
  completed_at: string | null
  completed_at_miles: number | null
  completed_cost_cents: number | null
  mechanic_notes: string | null
  is_public_to_mechanics: boolean
  created_at: string
  updated_at: string
}

export type VehicleDamageReport = {
  id: string
  listing_id: string
  host_id: string
  reservation_id: string | null
  severity: DamageSeverity
  category: DamageCategory
  title: string
  description: string | null
  discovered_at: string
  repair_cost_cents: number | null
  repair_status: DamageRepairStatus
  photos: string[]
  linked_task_id: string | null
  created_by: string | null
  created_at: string
}

export type VehicleHealthSummary = {
  openTaskCount: number
  urgentTaskCount: number
  openDamageCount: number
  milesSinceLastService: number | null
  nextDueTask: VehicleMaintenanceTask | null
  healthLevel: 'good' | 'attention' | 'urgent'
}

// ─── Default maintenance intervals seeded on first visit ──────────────────────

const DEFAULT_INTERVALS: Omit<VehicleMaintenanceInterval, 'id' | 'listing_id' | 'host_id' | 'created_at' | 'updated_at'>[] = [
  {
    kind: 'oil_change',
    label: 'Oil Change',
    every_miles: 5000,
    every_days: 180,
    last_completed_miles: null,
    last_completed_at: null,
    enabled: true,
    notes: 'Change engine oil and filter per manufacturer specs.',
  },
  {
    kind: 'tire_rotation',
    label: 'Tire Rotation',
    every_miles: 7500,
    every_days: null,
    last_completed_miles: null,
    last_completed_at: null,
    enabled: true,
    notes: null,
  },
  {
    kind: 'brake_inspection',
    label: 'Brake Inspection',
    every_miles: 12000,
    every_days: 365,
    last_completed_miles: null,
    last_completed_at: null,
    enabled: true,
    notes: null,
  },
  {
    kind: 'inspection',
    label: 'Full Vehicle Inspection',
    every_miles: null,
    every_days: 365,
    last_completed_miles: null,
    last_completed_at: null,
    enabled: true,
    notes: 'Annual safety inspection.',
  },
]

// ─── getVehicleProfile ────────────────────────────────────────────────────────

/**
 * Fetches the vehicle profile for a listing, lazily creating it when absent.
 * Returns null when Supabase is not configured.
 */
export async function getVehicleProfile(listingId: string): Promise<VehicleProfile | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: existing } = await supabase
    .from('vehicle_profiles')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) return existing as VehicleProfile

  const { data: created } = await supabase
    .from('vehicle_profiles')
    .insert({ listing_id: listingId, host_id: user.id })
    .select('*')
    .single()

  return created as VehicleProfile | null
}

// ─── seedDefaultIntervals ─────────────────────────────────────────────────────

/**
 * Inserts a sensible default set of maintenance intervals on first health-page
 * visit. Idempotent — skips if any intervals already exist for this listing.
 */
export async function seedDefaultIntervals(listingId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { count } = await supabase
    .from('vehicle_maintenance_intervals')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)

  if (count && count > 0) return

  const rows = DEFAULT_INTERVALS.map((interval) => ({
    ...interval,
    listing_id: listingId,
    host_id: user.id,
  }))

  await supabase.from('vehicle_maintenance_intervals').insert(rows)
}

// ─── summarizeVehicleHealth ───────────────────────────────────────────────────

/**
 * Returns a compact health summary for a vehicle — used on the overview card
 * and for health-level pill calculations.
 */
export async function summarizeVehicleHealth(listingId: string): Promise<VehicleHealthSummary> {
  const supabase = await createServerSupabaseClient()

  const empty: VehicleHealthSummary = {
    openTaskCount: 0,
    urgentTaskCount: 0,
    openDamageCount: 0,
    milesSinceLastService: null,
    nextDueTask: null,
    healthLevel: 'good',
  }

  if (!supabase) return empty

  const [tasksResult, damageResult, profileResult, lastServiceResult] = await Promise.all([
    supabase
      .from('vehicle_maintenance_tasks')
      .select('id, priority, status, due_at_date, due_at_miles, title, kind, listing_id, host_id, interval_id, description, completed_at, completed_at_miles, completed_cost_cents, mechanic_notes, is_public_to_mechanics, created_at, updated_at')
      .eq('listing_id', listingId)
      .in('status', ['open', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_at_date', { ascending: true, nullsFirst: false }),

    supabase
      .from('vehicle_damage_reports')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .in('repair_status', ['unresolved', 'in_progress']),

    supabase
      .from('vehicle_profiles')
      .select('current_odometer_miles')
      .eq('listing_id', listingId)
      .maybeSingle(),

    supabase
      .from('vehicle_maintenance_tasks')
      .select('completed_at_miles')
      .eq('listing_id', listingId)
      .eq('status', 'completed')
      .not('completed_at_miles', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const openTasks = (tasksResult.data ?? []) as VehicleMaintenanceTask[]
  const openTaskCount = openTasks.length
  const urgentTaskCount = openTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
  const openDamageCount = damageResult.count ?? 0
  const currentMiles = (profileResult.data as { current_odometer_miles: number | null } | null)?.current_odometer_miles ?? null
  const lastServiceMiles = (lastServiceResult.data as { completed_at_miles: number | null } | null)?.completed_at_miles ?? null
  const milesSinceLastService =
    currentMiles !== null && lastServiceMiles !== null ? currentMiles - lastServiceMiles : null

  const nextDueTask = openTasks[0] ?? null

  let healthLevel: VehicleHealthSummary['healthLevel'] = 'good'
  if (urgentTaskCount > 0 || openDamageCount > 1) {
    healthLevel = 'urgent'
  } else if (openTaskCount > 0 || openDamageCount > 0) {
    healthLevel = 'attention'
  }

  return {
    openTaskCount,
    urgentTaskCount,
    openDamageCount,
    milesSinceLastService,
    nextDueTask,
    healthLevel,
  }
}

// ─── recordMileageEntry ───────────────────────────────────────────────────────

export type RecordMileageInput = {
  listingId: string
  source: MileageSource
  startOdometer?: number
  endOdometer?: number
  tripStartDate?: string
  tripEndDate?: string
  reservationId?: string
  externalBlockId?: string
  /** Used with external_block_id when start/end odometer are not provided. */
  hostReportedTripMiles?: number
  notes?: string
}

/**
 * Inserts a mileage log entry and advances the vehicle profile's current
 * odometer only when the new reading is greater than the stored value.
 */
export async function recordMileageEntry(input: RecordMileageInput): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  let startOdometer = input.startOdometer ?? null
  let endOdometer = input.endOdometer ?? null
  let hostReportedTripMiles: number | null =
    input.hostReportedTripMiles != null && Number.isFinite(input.hostReportedTripMiles) && input.hostReportedTripMiles > 0
      ? Math.round(input.hostReportedTripMiles)
      : null

  // External trip claim with trip miles only: derive odometer range when current reading exists.
  if (
    input.externalBlockId &&
    hostReportedTripMiles != null &&
    (startOdometer == null || endOdometer == null)
  ) {
    const { data: profileRow } = await supabase
      .from('vehicle_profiles')
      .select('current_odometer_miles')
      .eq('listing_id', input.listingId)
      .maybeSingle()
    const currentMiles = (profileRow as { current_odometer_miles: number | null } | null)?.current_odometer_miles
    if (typeof currentMiles === 'number' && currentMiles >= 0) {
      startOdometer = currentMiles
      endOdometer = currentMiles + hostReportedTripMiles
      hostReportedTripMiles = null
    }
  }

  const insertPayload = {
    listing_id: input.listingId,
    host_id: user.id,
    reservation_id: input.reservationId ?? null,
    external_block_id: input.externalBlockId ?? null,
    source: input.source,
    start_odometer: startOdometer,
    end_odometer: endOdometer,
    trip_start_date: input.tripStartDate ?? null,
    trip_end_date: input.tripEndDate ?? null,
    recorded_by: user.id,
    notes: input.notes ?? null,
    ...(hostReportedTripMiles != null ? { host_reported_trip_miles: hostReportedTripMiles } : {}),
  }

  const { error: insertError } = await supabase.from('vehicle_mileage_logs').insert(insertPayload)

  if (insertError) return { error: insertError.message }

  // Advance odometer only when newer reading is higher.
  if (endOdometer != null && endOdometer > 0) {
    const { data: profile } = await supabase
      .from('vehicle_profiles')
      .select('current_odometer_miles')
      .eq('listing_id', input.listingId)
      .maybeSingle()

    const current = (profile as { current_odometer_miles: number | null } | null)?.current_odometer_miles ?? null
    if (current == null || endOdometer > current) {
      await supabase
        .from('vehicle_profiles')
        .upsert({
          listing_id: input.listingId,
          host_id: user.id,
          current_odometer_miles: endOdometer,
          current_odometer_updated_at: new Date().toISOString(),
        })
    }
  }

  return { error: null }
}
