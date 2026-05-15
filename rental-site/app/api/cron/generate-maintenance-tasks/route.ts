/**
 * Nightly cron — auto-generate maintenance tasks when intervals approach due thresholds.
 *
 * Logic:
 *  For each enabled vehicle_maintenance_interval:
 *   - Compute miles_due = last_completed_miles + every_miles  (if set)
 *   - Compute date_due  = last_completed_at  + every_days     (if set)
 *   - If current_odometer >= miles_due * 0.9 OR now >= date_due - 14 days:
 *     AND no existing open/in_progress task with this interval_id:
 *       → insert a new task with auto-derived priority
 *
 * Priority derivation:
 *   - overdue         → urgent
 *   - within 10%/7 days → high
 *   - within 25%/14 days → medium
 *   - otherwise        → low
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendHostMaintenanceDigest } from '@/lib/vehicle-health-emails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized invocations.
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service role client not available' }, { status: 500 })
  }

  const now = new Date()
  let tasksCreated = 0
  let errors = 0

  // Fetch all enabled intervals with their vehicle profile (for current odometer).
  const { data: intervals, error: fetchError } = await supabase
    .from('vehicle_maintenance_intervals')
    .select(`
      id,
      listing_id,
      host_id,
      kind,
      label,
      every_miles,
      every_days,
      last_completed_miles,
      last_completed_at
    `)
    .eq('enabled', true)

  if (fetchError || !intervals) {
    return NextResponse.json({ error: fetchError?.message ?? 'Failed to fetch intervals' }, { status: 500 })
  }

  // Batch: fetch current odometers for all distinct listing_ids.
  const listingIds = Array.from(new Set(intervals.map((i: { listing_id: string }) => i.listing_id)))
  const { data: profiles } = await supabase
    .from('vehicle_profiles')
    .select('listing_id, current_odometer_miles')
    .in('listing_id', listingIds)

  const odometerMap = new Map<string, number | null>(
    (profiles ?? []).map((p: { listing_id: string; current_odometer_miles: number | null }) => [p.listing_id, p.current_odometer_miles])
  )

  // Fetch existing open/in_progress tasks for these intervals to avoid duplicates.
  const { data: existingTasks } = await supabase
    .from('vehicle_maintenance_tasks')
    .select('interval_id')
    .in('interval_id', intervals.map((i: { id: string }) => i.id))
    .in('status', ['open', 'in_progress'])

  const activeIntervalIds = new Set(
    (existingTasks ?? []).map((t: { interval_id: string | null }) => t.interval_id).filter(Boolean)
  )

  const tasksToInsert: {
    listing_id: string
    host_id: string
    interval_id: string
    kind: string
    title: string
    description: string
    priority: string
    status: string
    due_at_miles: number | null
    due_at_date: string | null
  }[] = []

  for (const interval of intervals as {
    id: string
    listing_id: string
    host_id: string
    kind: string
    label: string
    every_miles: number | null
    every_days: number | null
    last_completed_miles: number | null
    last_completed_at: string | null
  }[]) {
    // Skip if there's already an active task for this interval.
    if (activeIntervalIds.has(interval.id)) continue

    const currentMiles = odometerMap.get(interval.listing_id) ?? null
    let shouldCreate = false
    let priorityLevel = 0 // 0=low,1=medium,2=high,3=urgent
    let dueAtMiles: number | null = null
    let dueAtDate: string | null = null

    // Miles-based check
    if (interval.every_miles !== null) {
      const lastMiles = interval.last_completed_miles ?? 0
      const milesDue = lastMiles + interval.every_miles
      dueAtMiles = milesDue
      if (currentMiles !== null) {
        const remaining = milesDue - currentMiles
        const threshold = interval.every_miles * 0.9
        if (currentMiles >= milesDue) {
          shouldCreate = true
          priorityLevel = Math.max(priorityLevel, 3)
        } else if (remaining <= interval.every_miles * 0.1) {
          shouldCreate = true
          priorityLevel = Math.max(priorityLevel, 2)
        } else if (currentMiles >= threshold) {
          shouldCreate = true
          priorityLevel = Math.max(priorityLevel, 1)
        }
      }
    }

    // Date-based check
    if (interval.every_days !== null) {
      const lastDate = interval.last_completed_at ? new Date(interval.last_completed_at) : new Date(0)
      const dateDue = addDays(lastDate, interval.every_days)
      dueAtDate = dateDue.toISOString().split('T')[0]
      const daysUntilDue = Math.floor((dateDue.getTime() - now.getTime()) / 86400000)
      if (daysUntilDue <= 0) {
        shouldCreate = true
        priorityLevel = Math.max(priorityLevel, 3)
      } else if (daysUntilDue <= 7) {
        shouldCreate = true
        priorityLevel = Math.max(priorityLevel, 2)
      } else if (daysUntilDue <= 14) {
        shouldCreate = true
        priorityLevel = Math.max(priorityLevel, 1)
      }
    }

    const priorityNames: ('low' | 'medium' | 'high' | 'urgent')[] = ['low', 'medium', 'high', 'urgent']
    const priority = priorityNames[priorityLevel]

    if (!shouldCreate) continue

    tasksToInsert.push({
      listing_id: interval.listing_id,
      host_id: interval.host_id,
      interval_id: interval.id,
      kind: interval.kind,
      title: interval.label,
      description: `Auto-generated: service interval reminder for "${interval.label}".`,
      priority,
      status: 'open',
      due_at_miles: dueAtMiles,
      due_at_date: dueAtDate,
    })
  }

  if (tasksToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('vehicle_maintenance_tasks')
      .insert(tasksToInsert)

    if (insertError) {
      errors++
      console.error('[generate-maintenance-tasks] insert error:', insertError.message)
    } else {
      tasksCreated = tasksToInsert.length
    }
  }

  // ─── Send daily digest emails for hosts with high/urgent open tasks ──────────
  // Collect all open/in_progress high+urgent tasks across all hosts.
  const { data: urgentTasks } = await supabase
    .from('vehicle_maintenance_tasks')
    .select(`
      id,
      listing_id,
      host_id,
      title,
      priority,
      due_at_date,
      listings!inner(title, owner_id)
    `)
    .in('status', ['open', 'in_progress'])
    .in('priority', ['high', 'urgent'])

  if (urgentTasks && urgentTasks.length > 0) {
    // Group by host_id
    const byHost = new Map<string, typeof urgentTasks>()
    for (const t of urgentTasks) {
      const existing = byHost.get(t.host_id) ?? []
      existing.push(t)
      byHost.set(t.host_id, existing)
    }

    // Fetch host profiles + emails
    const hostIds = Array.from(byHost.keys())
    const { data: hostProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', hostIds)

    // Fetch emails via supabase.auth.admin.listUsers (service role only).
    let emailMap = new Map<string, string>()
    try {
      const { data: { users } } = await (supabase as unknown as { auth: { admin: { listUsers: () => Promise<{ data: { users: { id: string; email?: string }[] } }> } } }).auth.admin.listUsers()
      emailMap = new Map(users.map((u) => [u.id, u.email ?? '']))
    } catch {
      // listUsers may not be available in all environments; skip digests silently.
    }

    const profileMap = new Map((hostProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))

    for (const hostId of Array.from(byHost.keys())) {
      const tasks = byHost.get(hostId)!
      const email = emailMap.get(hostId)
      if (!email) continue
      const profile = profileMap.get(hostId)
      const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
      await sendHostMaintenanceDigest({
        to: email,
        hostFirstName: firstName,
        tasks: tasks.map((t) => ({
          title: t.title,
          priority: t.priority as 'high' | 'urgent',
          listingTitle: (t as unknown as { listings: { title: string } }).listings?.title ?? '',
          listingId: t.listing_id,
          dueAtDate: t.due_at_date ?? null,
        })),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    intervalsChecked: intervals.length,
    tasksCreated,
    errors,
  })
}
