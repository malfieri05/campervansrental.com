/**
 * Chatbot helpers: listing context builder, text chunking, embedding, and
 * similarity search — all server-only.
 */

import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { pickupAreaFromAddress } from '@/lib/listing-public-pickup'

// ─── Context text ─────────────────────────────────────────────────────────────

export function buildListingContextText(row: Record<string, unknown>): string {
  const lines: string[] = []

  const add = (label: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') {
      lines.push(`${label}: ${String(value)}`)
    }
  }

  add('Vehicle name', row.title)
  add('Tagline', row.tagline)
  add('Description', row.description)
  add('Location', row.location_label)
  add(
    'Approximate pickup area',
    pickupAreaFromAddress({
      address_city: row.address_city as string | null | undefined,
      address_state: row.address_state as string | null | undefined,
      address_country: row.address_country as string | null | undefined,
    })
  )
  add('Vehicle class', row.vehicle_class)
  add('Year', row.vehicle_year)
  add('Make', row.vehicle_make)
  add('Model', row.vehicle_model)
  add('Length', row.length_label)
  add('Sleeps', row.sleeps)
  add('Seatbelts', row.seatbelts)
  add('Category', row.category)
  add('Price per night', row.price_per_night_cents ? `$${Math.round(Number(row.price_per_night_cents) / 100)}/night` : null)
  add('Cleaning fee', row.cleaning_fee_cents ? `$${Math.round(Number(row.cleaning_fee_cents) / 100)}` : null)
  add('Min nights', row.min_nights)
  add('Security deposit', row.security_deposit_cents ? `$${Math.round(Number(row.security_deposit_cents) / 100)}` : null)
  add('Cancellation policy', row.cancellation_policy)
  add("What's included", row.whats_included)
  add('Trip recommendations', row.trip_recommendations)
  add('Other notes', row.other_things_note)
  add('Pick-up / drop-off instructions', row.pickup_dropoff_rules_text)

  // Rules
  const rules = row.rules as Record<string, unknown> | null | undefined
  if (rules) {
    add('Pets allowed', rules.petsAllowed ? 'Yes' : 'No')
    add('Smoking allowed', rules.smokingAllowed ? 'Yes' : 'No')
    add('Pickup time', rules.tripPickupTime)
    add('Return time', rules.tripReturnTime)
    add('Custom rules', rules.customRules)
    add('Min driver age', rules.minDriverAge)
    add('Instant book', rules.instantBook ? 'Yes' : 'No')
    add('One-way trips ok', rules.oneWayOk ? 'Yes' : 'No')
  }

  // Amenities
  const amenities = row.amenities as Array<{ label: string }> | null | undefined
  if (Array.isArray(amenities) && amenities.length > 0) {
    lines.push(`Amenities: ${amenities.map((a) => a.label).join(', ')}`)
  }

  // Features
  const features = row.features as string[] | null | undefined
  if (Array.isArray(features) && features.length > 0) {
    lines.push(`Features: ${features.join(', ')}`)
  }

  // FAQs
  const faqs = row.listing_faqs as Array<{ question: string; answer: string }> | null | undefined
  if (Array.isArray(faqs) && faqs.length > 0) {
    lines.push('\nFrequently asked questions:')
    for (const faq of faqs) {
      lines.push(`Q: ${faq.question}\nA: ${faq.answer}`)
    }
  }

  // Host KB notes
  if (row.listing_chatbot_notes) {
    lines.push('\nAdditional host information:')
    lines.push(String(row.listing_chatbot_notes))
  }

  return lines.join('\n')
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 800   // characters (≈200 tokens for typical prose)
const CHUNK_OVERLAP = 100

export function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text.trim()].filter(Boolean)

  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

// ─── Embedding ────────────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  })
  return embedding
}

// ─── Ingest document chunks ───────────────────────────────────────────────────

export async function ingestDocumentChunks(
  listingId: string,
  documentId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const svc = createServiceRoleClient()
  if (!svc) return { ok: false, error: 'Service role client unavailable' }

  const chunks = chunkText(text)
  if (!chunks.length) return { ok: false, error: 'No text content to embed' }

  // Delete any existing chunks for this document first
  await svc.from('listing_chat_chunks').delete().eq('document_id', documentId)

  const rows: Array<{ listing_id: string; document_id: string; content: string; embedding: number[] | null }> = []

  for (const chunk of chunks) {
    let embedding: number[] | null = null
    try {
      embedding = await embedText(chunk)
    } catch {
      // Proceed without embedding; chunk is still stored for text fallback
    }
    rows.push({ listing_id: listingId, document_id: documentId, content: chunk, embedding })
  }

  const { error } = await svc.from('listing_chat_chunks').insert(rows)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Vector similarity search ─────────────────────────────────────────────────

export async function searchListingChunks(
  listingId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<string[]> {
  const svc = createServiceRoleClient()
  if (!svc) return []

  const { data, error } = await svc.rpc('match_listing_chunks', {
    p_listing_id: listingId,
    p_embedding: queryEmbedding,
    p_match_count: topK,
  })

  if (error || !data) return []
  return (data as Array<{ content: string }>).map((r) => r.content)
}
