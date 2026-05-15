'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { recordMileageEntry } from '@/lib/vehicle-health'
import type {
  VehicleMaintenanceTask,
  VehicleDamageReport,
  MaintenanceKind,
  MaintenancePriority,
  DamageSeverity,
  DamageCategory,
} from '@/lib/vehicle-health'

// ─── logMileage ───────────────────────────────────────────────────────────────

export async function logMileage(
  listingId: string,
  fd: FormData
): Promise<{ error: string | null }> {
  const startOdometer = fd.get('start_odometer') ? Number(fd.get('start_odometer')) : undefined
  const endOdometer = fd.get('end_odometer') ? Number(fd.get('end_odometer')) : undefined
  const tripStartDate = (fd.get('trip_start_date') as string) || undefined
  const tripEndDate = (fd.get('trip_end_date') as string) || undefined
  const source = (fd.get('source') as 'platform' | 'external_calendar' | 'manual') || 'manual'
  const notes = (fd.get('notes') as string) || undefined

  const result = await recordMileageEntry({
    listingId,
    source,
    startOdometer,
    endOdometer,
    tripStartDate,
    tripEndDate,
    notes,
  })

  if (!result.error) {
    revalidatePath(`/host/health/${listingId}`)
    revalidatePath('/host/health')
    revalidatePath('/host')
  }

  return result
}

// ─── claimExternalTripMiles ───────────────────────────────────────────────────
/** Log trip miles for a synced off-platform calendar block (clears "untracked" row). */

export async function claimExternalTripMiles(
  listingId: string,
  externalBlockId: string,
  tripMiles: number
): Promise<{ error: string | null }> {
  if (!Number.isFinite(tripMiles) || tripMiles <= 0) {
    return { error: 'Enter a positive number of miles.' }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return { error: 'Listing not found.' }

  const { data: block } = await supabase
    .from('availability_blocks')
    .select('id, listing_id, start_date, end_date, block_type')
    .eq('id', externalBlockId)
    .maybeSingle()

  if (!block || block.listing_id !== listingId || block.block_type !== 'external_sync') {
    return { error: 'Trip not found.' }
  }

  const result = await recordMileageEntry({
    listingId,
    source: 'external_calendar',
    externalBlockId,
    tripStartDate: block.start_date,
    tripEndDate: block.end_date,
    hostReportedTripMiles: Math.round(tripMiles),
  })

  if (!result.error) {
    revalidatePath(`/host/health/${listingId}`)
    revalidatePath('/host/health')
    revalidatePath('/host')
  }

  return result
}

// ─── logDamage ────────────────────────────────────────────────────────────────

export async function logDamage(
  listingId: string,
  fd: FormData
): Promise<{ error: string | null; damage?: VehicleDamageReport }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const title = fd.get('title') as string
  if (!title?.trim()) return { error: 'Title is required.' }

  const severity = (fd.get('severity') as DamageSeverity) || 'minor'
  const category = (fd.get('category') as DamageCategory) || 'other'
  const discoveredAt = (fd.get('discovered_at') as string) || new Date().toISOString().split('T')[0]
  const description = (fd.get('description') as string) || null
  const repairCostDollars = fd.get('repair_cost_dollars') ? Number(fd.get('repair_cost_dollars')) : null
  const repairCostCents = repairCostDollars ? Math.round(repairCostDollars * 100) : null

  // Handle photo uploads first
  const photoFiles = fd.getAll('photos') as File[]
  const photoPaths: string[] = []

  for (const file of photoFiles) {
    if (!(file instanceof File) || file.size === 0) continue
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `damage/${listingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path)
      photoPaths.push(urlData.publicUrl)
    }
  }

  const { data, error } = await supabase
    .from('vehicle_damage_reports')
    .insert({
      listing_id: listingId,
      host_id: user.id,
      severity,
      category,
      title: title.trim(),
      description,
      discovered_at: discoveredAt,
      repair_cost_cents: repairCostCents,
      photos: photoPaths,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/host/health/${listingId}`)
  revalidatePath('/host/health')

  return { error: null, damage: data as VehicleDamageReport }
}

// ─── upsertTask ───────────────────────────────────────────────────────────────

export async function upsertTask(
  listingId: string,
  fd: FormData
): Promise<{ error: string | null; task?: VehicleMaintenanceTask }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const title = fd.get('title') as string
  if (!title?.trim()) return { error: 'Title is required.' }

  const taskId = (fd.get('task_id') as string) || null
  const kind = (fd.get('kind') as MaintenanceKind) || 'custom'
  const priority = (fd.get('priority') as MaintenancePriority) || 'medium'
  const description = (fd.get('description') as string) || null
  const dueAtDate = (fd.get('due_at_date') as string) || null
  const dueAtMiles = fd.get('due_at_miles') ? Number(fd.get('due_at_miles')) : null

  const payload = {
    listing_id: listingId,
    host_id: user.id,
    kind,
    title: title.trim(),
    description,
    priority,
    due_at_date: dueAtDate,
    due_at_miles: dueAtMiles,
  }

  let result
  if (taskId) {
    result = await supabase
      .from('vehicle_maintenance_tasks')
      .update(payload)
      .eq('id', taskId)
      .eq('host_id', user.id)
      .select('*')
      .single()
  } else {
    result = await supabase
      .from('vehicle_maintenance_tasks')
      .insert({ ...payload, status: 'open' })
      .select('*')
      .single()
  }

  if (result.error) return { error: result.error.message }

  revalidatePath(`/host/health/${listingId}`)

  return { error: null, task: result.data as VehicleMaintenanceTask }
}

// ─── completeTask ─────────────────────────────────────────────────────────────

export async function completeTask(taskId: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: task } = await supabase
    .from('vehicle_maintenance_tasks')
    .select('id, listing_id')
    .eq('id', taskId)
    .eq('host_id', user.id)
    .maybeSingle()

  if (!task) return { error: 'Task not found.' }

  const { error } = await supabase
    .from('vehicle_maintenance_tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/host/health/${task.listing_id}`)
  revalidatePath('/host/health')

  return { error: null }
}

// ─── deleteTask ───────────────────────────────────────────────────────────────

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: task } = await supabase
    .from('vehicle_maintenance_tasks')
    .select('id, listing_id')
    .eq('id', taskId)
    .eq('host_id', user.id)
    .maybeSingle()

  if (!task) return { error: 'Task not found.' }

  const { error } = await supabase
    .from('vehicle_maintenance_tasks')
    .delete()
    .eq('id', taskId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/host/health/${task.listing_id}`)

  return { error: null }
}

// ─── togglePublicToMechanics ──────────────────────────────────────────────────

export async function togglePublicToMechanics(
  taskId: string,
  value: boolean
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: task } = await supabase
    .from('vehicle_maintenance_tasks')
    .select('id, listing_id')
    .eq('id', taskId)
    .eq('host_id', user.id)
    .maybeSingle()

  if (!task) return { error: 'Task not found.' }

  const { error } = await supabase
    .from('vehicle_maintenance_tasks')
    .update({ is_public_to_mechanics: value })
    .eq('id', taskId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  // Invalidate the mechanic public feed cache (Phase 3).
  const { revalidateTag } = await import('next/cache')
  revalidateTag('mechanic-feed')
  revalidatePath(`/host/health/${task.listing_id}`)

  return { error: null }
}

// ─── uploadDamagePhoto ────────────────────────────────────────────────────────
// Returns a signed upload URL for a single damage photo (used for standalone upload flows).

export async function uploadDamagePhoto(
  listingId: string,
  fileName: string,
  contentType: string
): Promise<{ signedUrl: string | null; path: string | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { signedUrl: null, path: null, error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { signedUrl: null, path: null, error: 'Unauthenticated' }

  const ext = fileName.split('.').pop() ?? 'jpg'
  const path = `damage/${listingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('listing-images')
    .createSignedUploadUrl(path)

  if (error) return { signedUrl: null, path: null, error: error.message }

  return { signedUrl: data.signedUrl, path, error: null }
}

// ─── acceptQuote (Phase 3 stub) ───────────────────────────────────────────────

export async function acceptQuote(quoteId: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: quote } = await supabase
    .from('mechanic_quotes')
    .select('id, task_id, host_id')
    .eq('id', quoteId)
    .eq('host_id', user.id)
    .maybeSingle()

  if (!quote) return { error: 'Quote not found.' }

  const { error } = await supabase
    .from('mechanic_quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId)

  if (error) return { error: error.message }

  // Mark the task in_progress and decline other pending quotes.
  await Promise.all([
    supabase
      .from('vehicle_maintenance_tasks')
      .update({ status: 'in_progress' })
      .eq('id', quote.task_id),
    supabase
      .from('mechanic_quotes')
      .update({ status: 'declined' })
      .eq('task_id', quote.task_id)
      .eq('status', 'pending')
      .neq('id', quoteId),
  ])

  const { revalidateTag } = await import('next/cache')
  revalidateTag('mechanic-feed')

  return { error: null }
}

// ─── declineQuote (Phase 3 stub) ──────────────────────────────────────────────

export async function declineQuote(quoteId: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { error } = await supabase
    .from('mechanic_quotes')
    .update({ status: 'declined' })
    .eq('id', quoteId)
    .eq('host_id', user.id)

  if (error) return { error: error.message }

  return { error: null }
}

// ─── sendMessage (Phase 3 stub) ───────────────────────────────────────────────

export async function sendMessage(
  taskId: string,
  body: string,
  quoteId?: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { error } = await supabase.from('mechanic_task_messages').insert({
    task_id: taskId,
    quote_id: quoteId ?? null,
    sender_id: user.id,
    sender_role: 'host',
    body,
  })

  if (error) return { error: error.message }

  return { error: null }
}
