'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uniqueSlug } from '@/lib/slug'
import type { Van } from '@/types'

// ─── Shared types ────────────────────────────────────────────────────────────

export type AddOn = {
  id: string
  name: string
  description?: string
  price_cents: number
  charge_type: 'daily' | 'per_trip' | 'upon_return'
}

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict'

export type PricingRuleKind = 'min_stay' | 'length_discount' | 'date_price_adjustment'

export type LengthDiscountTier = {
  nights: number
  pct: number
}

export type PricingRule = {
  id: string
  kind: PricingRuleKind
  name: string
  summaryLines: string[]
  datesLabel: string
  enabled: boolean
  status: 'active' | 'expired'
  // min_stay
  minNights?: number
  // length_discount
  tiers?: LengthDiscountTier[]
  // date_price_adjustment
  startDate?: string
  endDate?: string
  nightlyDeltaCents?: number
}

export type FAQ = {
  id: string
  question: string
  answer: string
}

/** Appends setup hint when PostgREST reports missing columns (migrations not applied). */
function withSchemaHint(message: string): string {
  if (
    /schema cache/i.test(message) ||
    /Could not find the/i.test(message) ||
    /column.*does not exist/i.test(message)
  ) {
    return `${message} — Your database is missing columns the app expects. In the Supabase Dashboard, open SQL Editor and run the files in supabase/migrations/ (at minimum 00002_listing_fields_v2.sql, 00003_listing_host_content.sql, and 00004_ensure_listings_columns.sql), or run: npx supabase db push`
  }
  return message
}

export type ListingDraftInput = {
  id: string
  // Basic info
  title?: string
  tagline?: string
  description?: string
  // Vehicle specs
  vehicle_class?: string
  vehicle_year?: number | null
  vehicle_make?: string
  vehicle_model?: string
  vin?: string | null
  license_plate?: string | null
  registration_doc_url?: string | null
  insurance_doc_url?: string | null
  length_label?: string
  sleeps?: number
  seatbelts?: number | null
  category?: Van['category']
  // Location
  location_label?: string
  address_street?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  address_country?: string
  // Details content
  whats_included?: string | null
  listing_faqs?: FAQ[]
  trip_recommendations?: string | null
  other_things_note?: string | null
  // Photos
  youtube_video_url?: string | null
  // Delivery
  delivery_offered?: boolean
  delivery_radius_miles?: number | null
  delivery_fee_cents?: number | null
  delivery_per_mile_cents?: number | null
  // Pricing
  price_per_night_cents?: number
  weekly_rate_cents?: number | null
  monthly_rate_cents?: number | null
  security_deposit_cents?: number | null
  cleaning_fee_cents?: number
  insurance_fee_cents?: number
  mileage_fee_cents?: number | null
  generator_fee_cents?: number | null
  min_nights?: number
  max_nights?: number | null
  // Profit plan
  pricing_rules?: PricingRule[]
  // Amenities & features
  amenities?: unknown
  features?: string[]
  // Add-ons
  add_ons?: AddOn[]
  // Rules & policies
  rules?: Record<string, unknown>
  cancellation_policy?: CancellationPolicy | null
  cancellation_notes?: string | null
  // Availability settings
  lead_time_days?: number | null
  buffer_days?: number | null
}

// ─── Create draft ─────────────────────────────────────────────────────────────

export async function createDraftListing(): Promise<{ id: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { id: null, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { id: null, error: 'Unauthorized' }

  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  const slug = `draft-${suffix}`

  const defaultMinStayRule: PricingRule = {
    id: crypto.randomUUID(),
    kind: 'min_stay',
    name: 'Minimum Days Rental Rule',
    summaryLines: ['Minimum stay 1 night'],
    datesLabel: 'Everyday',
    enabled: true,
    status: 'active',
    minNights: 1,
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      slug,
      title: 'New listing',
      status: 'draft',
      tagline: '',
      description: '',
      price_per_night_cents: 19900,
      cleaning_fee_cents: 15000,
      insurance_fee_cents: 7500,
      security_deposit_cents: 100000,
      min_nights: 1,
      lead_time_days: 1,
      buffer_days: 0,
      sleeps: 2,
      category: 'classic',
      cancellation_policy: 'moderate',
      amenities: [],
      features: [],
      add_ons: [],
      rules: {},
      listing_faqs: [],
      pricing_rules: [defaultMinStayRule],
    })
    .select('id')
    .single()

  if (error || !data) {
    return { id: null, error: withSchemaHint(error?.message ?? 'Insert failed') }
  }

  await supabase.from('profiles').update({ is_host: true }).eq('id', user.id)

  revalidatePath('/host')
  revalidatePath('/host/listings')
  return { id: data.id as string }
}

// ─── Update listing ───────────────────────────────────────────────────────────

export async function updateListing(
  input: ListingDraftInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { id, ...patch } = input
  const { error } = await supabase
    .from('listings')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: withSchemaHint(error.message) }
  revalidatePath('/host')
  revalidatePath('/host/listings')
  revalidatePath(`/host/listings/${id}/edit`)
  revalidatePath('/fleet')
  revalidatePath('/listings')
  return { ok: true }
}

// ─── Publish listing ──────────────────────────────────────────────────────────

export async function publishListing(
  listingId: string,
  title: string
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const slug = uniqueSlug(title, crypto.randomUUID())

  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'published',
      title,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .select('slug')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Publish failed' }

  revalidatePath('/fleet')
  revalidatePath(`/listings/${data.slug}`)
  revalidatePath('/host')
  revalidatePath('/host/listings')
  return { ok: true, slug: data.slug as string }
}

export async function deleteListing(
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: withSchemaHint(error.message) }

  revalidatePath('/host')
  revalidatePath('/host/listings')
  revalidatePath('/host/calendar')
  revalidatePath('/host/bookings')
  revalidatePath('/fleet')
  revalidatePath('/listings')
  return { ok: true }
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function saveListingImage(
  listingId: string,
  url: string,
  sortOrder: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase.from('listing_images').insert({
    listing_id: listingId,
    url,
    sort_order: sortOrder,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { ok: true }
}

export async function deleteListingImage(
  imageId: string,
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('listing_images')
    .delete()
    .eq('id', imageId)
    .eq('listing_id', listingId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { ok: true }
}

/** Reorder images by persisting a new sort_order for each id. Accepts ordered array of image ids. */
export async function reorderListingImages(
  listingId: string,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  // Run all updates in parallel; fail fast on first error
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('listing_images')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('listing_id', listingId)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidatePath(`/host/listings/${listingId}/edit`)
  return { ok: true }
}

// ─── Availability blocks ──────────────────────────────────────────────────────

export async function addHostAvailabilityBlock(
  listingId: string,
  startDate: string,
  endDate: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase.from('availability_blocks').insert({
    listing_id: listingId,
    start_date: startDate,
    end_date: endDate,
    block_type: 'host_blocked',
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/listings/${listingId}/edit`)
  revalidatePath('/listings')
  return { ok: true }
}

export async function removeHostAvailabilityBlock(
  blockId: string,
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const { error } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('id', blockId)
    .eq('block_type', 'host_blocked')

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { ok: true }
}

// ─── Fetch for editing ────────────────────────────────────────────────────────

export async function getHostListingForEdit(
  listingId: string
): Promise<{ row: Record<string, unknown> | null; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { row: null, error: 'Supabase not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { row: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('listings')
    .select(
      `
      *,
      listing_images ( id, url, sort_order ),
      availability_blocks ( id, start_date, end_date, block_type )
    `
    )
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) return { row: null, error: error.message }
  return { row: data as Record<string, unknown> | null }
}
