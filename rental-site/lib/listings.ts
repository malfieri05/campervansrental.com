import { vans, formatVanLengthFt } from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Amenity, FAQ, Van } from '@/types'
import type { ListingReview } from '@/lib/listing-reviews'
import { pickupAreaFromAddress } from '@/lib/listing-public-pickup'

type ListingRow = {
  id: string
  slug: string
  title: string
  tagline: string | null
  description: string | null
  length_label: string | null
  sleeps: number
  location_label: string | null
  address_city: string | null
  address_state: string | null
  address_country: string | null
  category: Van['category']
  price_per_night_cents: number
  cleaning_fee_cents: number
  insurance_fee_cents: number
  min_nights: number | null
  security_deposit_cents: number | null
  amenities: Amenity[] | null
  features: string[] | null
  rules: Record<string, unknown> | null
  rating: string | number | null
  review_count: number | null
  listing_images?: { url: string; sort_order: number }[]
  // Extended content
  whats_included?: string | null
  listing_faqs?: FAQ[] | null
  trip_recommendations?: string | null
  youtube_video_url?: string | null
  pickup_dropoff_rules_text?: string | null
  pickup_dropoff_rules_doc_url?: string | null
  listing_chatbot_enabled?: boolean | null
  cancellation_policy?: string | null
}

function mapStaticVan(v: Van): Van {
  return {
    ...v,
    listingUuid: v.listingUuid ?? null,
    length: formatVanLengthFt(v.length) ?? '',
  }
}

function mapRowToVan(row: ListingRow): Van {
  const images =
    row.listing_images && row.listing_images.length > 0
      ? [...row.listing_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)
      : ['https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800']

  const amenities = Array.isArray(row.amenities) ? row.amenities : []

  return {
    id: row.slug,
    listingUuid: row.id,
    name: row.title,
    tagline: row.tagline || '',
    description: row.description || '',
    images,
    pricePerNight: Math.round(row.price_per_night_cents / 100),
    sleeps: row.sleeps,
    length: formatVanLengthFt(row.length_label) ?? '',
    features: row.features || [],
    amenities,
    category: row.category,
    available: true,
    // Use 0 when review_count is 0 so the UI can show "NEW!" instead of a fake rating.
    rating: (row.review_count ?? 0) > 0 ? Number(row.rating) : 0,
    reviewCount: row.review_count ?? 0,
    location: row.location_label || '',
    pickupAreaPublic: pickupAreaFromAddress(row),
    cleaningFeeCents: row.cleaning_fee_cents,
    insuranceFeeCents: row.insurance_fee_cents,
    minNights: row.min_nights ?? 1,
    securityDepositCents: row.security_deposit_cents ?? undefined,
    rules: row.rules || {},
    whatsIncluded: row.whats_included ?? null,
    faqs: Array.isArray(row.listing_faqs) ? row.listing_faqs : [],
    tripRecommendations: row.trip_recommendations ?? null,
    youtubeVideoUrl: row.youtube_video_url ?? null,
    pickupDropoffRulesText: row.pickup_dropoff_rules_text ?? null,
    pickupDropoffRulesDocUrl: row.pickup_dropoff_rules_doc_url ?? null,
    listingChatbotEnabled: Boolean(row.listing_chatbot_enabled),
    cancellationPolicy:
      row.cancellation_policy === 'flexible' ||
      row.cancellation_policy === 'moderate' ||
      row.cancellation_policy === 'strict'
        ? row.cancellation_policy
        : null,
  }
}

export async function getPublishedListings(): Promise<Van[]> {
  if (!isSupabaseConfigured()) {
    return vans.map(mapStaticVan)
  }

  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return vans.map(mapStaticVan)
    }

    const { data, error } = await supabase
      .from('listings')
      .select(
        `
      id,
      slug,
      title,
      tagline,
      description,
      length_label,
      sleeps,
      location_label,
      address_city,
      address_state,
      address_country,
      category,
      price_per_night_cents,
      cleaning_fee_cents,
      insurance_fee_cents,
      min_nights,
      security_deposit_cents,
      amenities,
      features,
      rules,
      rating,
      review_count,
      whats_included,
      listing_faqs,
      trip_recommendations,
      youtube_video_url,
      pickup_dropoff_rules_text,
      pickup_dropoff_rules_doc_url,
      listing_chatbot_enabled,
      cancellation_policy,
      listing_images (url, sort_order)
    `
      )
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (error || !data?.length) {
      return vans.map(mapStaticVan)
    }

    return (data as ListingRow[]).map(mapRowToVan)
  } catch {
    return vans.map(mapStaticVan)
  }
}

export async function getPublishedListingBySlug(slug: string): Promise<Van | null> {
  if (!isSupabaseConfigured()) {
    const v = vans.find((x) => x.id === slug)
    return v ? mapStaticVan(v) : null
  }

  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      const v = vans.find((x) => x.id === slug)
      return v ? mapStaticVan(v) : null
    }

    const { data, error } = await supabase
      .from('listings')
      .select(
        `
      id,
      slug,
      title,
      tagline,
      description,
      length_label,
      sleeps,
      location_label,
      address_city,
      address_state,
      address_country,
      category,
      price_per_night_cents,
      cleaning_fee_cents,
      insurance_fee_cents,
      min_nights,
      security_deposit_cents,
      amenities,
      features,
      rules,
      rating,
      review_count,
      whats_included,
      listing_faqs,
      trip_recommendations,
      youtube_video_url,
      pickup_dropoff_rules_text,
      pickup_dropoff_rules_doc_url,
      listing_chatbot_enabled,
      cancellation_policy,
      listing_images (url, sort_order)
    `
      )
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) {
      const v = vans.find((x) => x.id === slug)
      return v ? mapStaticVan(v) : null
    }

    return mapRowToVan(data as ListingRow)
  } catch {
    const v = vans.find((x) => x.id === slug)
    return v ? mapStaticVan(v) : null
  }
}

/** Fetch all reviews for a listing, newest first. Returns [] when Supabase is not configured. */
export async function getListingReviews(listingId: string): Promise<ListingReview[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('listing_reviews')
      .select(
        `
        id,
        listing_id,
        reservation_id,
        author_id,
        rating,
        body,
        created_at,
        profiles ( display_name )
      `
      )
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map((row) => {
      const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id as string,
        listing_id: row.listing_id as string,
        reservation_id: row.reservation_id as string,
        author_id: row.author_id as string,
        author_name: (profiles as { display_name: string | null } | null)?.display_name ?? null,
        rating: Number(row.rating),
        body: (row.body as string | null) ?? null,
        created_at: row.created_at as string,
      }
    })
  } catch {
    return []
  }
}

export { effectivePickupLabels, uniquePublishedPickupLabels } from '@/lib/home-fleet-search-url'

export async function getListingRowIdBySlugForOwner(
  slug: string,
  ownerId: string
): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return null
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('slug', slug)
      .eq('owner_id', ownerId)
      .maybeSingle()
    return data?.id ?? null
  } catch {
    return null
  }
}
