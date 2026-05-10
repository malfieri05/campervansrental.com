/**
 * Normalization helpers: map raw extracted strings → DB-typed values.
 */

import type { Van } from '@/types'
import type { ExtractedListing } from './types'
import type { ListingDraftInput } from '@/app/host/listings/actions'

// ─── Vehicle class mapping ────────────────────────────────────────────────────

const VEHICLE_CLASS_MAP: Array<{ keywords: string[]; canonical: string }> = [
  { keywords: ['class a', 'class-a', 'motorhome'], canonical: 'Class A Motorhome' },
  { keywords: ['class b', 'class-b', 'campervan', 'camper van', 'sprinter', 'transit', 'promaster'], canonical: 'Class B / Campervan' },
  { keywords: ['class c', 'class-c'], canonical: 'Class C Motorhome' },
  { keywords: ['travel trailer', 'towable'], canonical: 'Travel Trailer' },
  { keywords: ['fifth wheel', '5th wheel'], canonical: 'Fifth Wheel' },
  { keywords: ['pop-up', 'popup', 'tent trailer', 'folding'], canonical: 'Pop-up / Tent Trailer' },
  { keywords: ['converted van', 'skoolie', 'van conversion', 'custom van'], canonical: 'Converted Van' },
  { keywords: ['vintage', 'classic', 'retro', 'antique'], canonical: 'Vintage / Classic' },
]

function guessVehicleClass(raw: string): string | undefined {
  const lower = raw.toLowerCase()
  for (const { keywords, canonical } of VEHICLE_CLASS_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return canonical
  }
  return undefined
}

// ─── Category mapping ─────────────────────────────────────────────────────────

function guessCategory(extracted: ExtractedListing): Van['category'] | undefined {
  const tokens = [
    extracted.title ?? '',
    extracted.description ?? '',
    extracted.vehicle_model ?? '',
  ].join(' ').toLowerCase()

  if (tokens.includes('luxury') || tokens.includes('premium') || tokens.includes('upscale')) return 'luxury'
  if (tokens.includes('adventure') || tokens.includes('offgrid') || tokens.includes('off-grid') || tokens.includes('overland')) return 'adventure'
  if (tokens.includes('family') || tokens.includes('motorhome') || tokens.includes('class a')) return 'classic'
  return undefined
}

// ─── Strip HTML from descriptions ────────────────────────────────────────────

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ─── Amenity fuzzy match ──────────────────────────────────────────────────────

/**
 * All known canonical amenity labels from AmenitiesStep, flattened.
 * Keep this in sync with AMENITY_CATEGORIES in AmenitiesStep.tsx.
 */
const KNOWN_AMENITIES: string[] = [
  'King / queen bed',
  'Linens & towels included',
  'Outdoor shower',
  'Indoor shower / wet bath',
  'Composting toilet',
  'Kitchen / kitchenette',
  'Espresso machine',
  'BBQ / grill',
  'Air conditioning',
  'Heater',
  'Heated floors',
  'Solar power',
  'Solar generator',
  'Generator (gas/propane)',
  'TV / streaming',
  'Bluetooth audio',
  'Stargazing skylight',
  'Wi-Fi',
  'Bike rack',
  'Kayak / board rack',
  'Outdoor furniture',
  'Pet amenities',
  'GPS navigation',
  'Keyless entry',
]

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
}

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b)
  return a.filter((t) => setB.has(t)).length
}

/** Return the canonical amenity label for a raw string, or null if no good match. */
export function matchAmenity(raw: string): string | null {
  const rawTokens = tokenize(raw)
  if (rawTokens.length === 0) return null

  let best: string | null = null
  let bestScore = 0

  for (const label of KNOWN_AMENITIES) {
    const labelTokens = tokenize(label)
    const score = overlapScore(rawTokens, labelTokens)
    if (score > bestScore && score >= 1) {
      // Require at least 1 meaningful overlapping token (skip short stopwords)
      const meaningful = rawTokens.filter(t => t.length > 2 && labelTokens.includes(t))
      if (meaningful.length >= 1) {
        bestScore = score
        best = label
      }
    }
  }
  return best
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

export type NormalizationResult = {
  patch: Partial<Omit<ListingDraftInput, 'id' | 'vin' | 'license_plate' | 'registration_doc_url' | 'insurance_doc_url'>>
  matchedAmenities: Array<{ icon: string; label: string }>
  unmatchedAmenities: string[]
  pricePerNightDollars: number | undefined
}

export function normalizeExtracted(extracted: ExtractedListing): NormalizationResult {
  const patch: NormalizationResult['patch'] = {}

  if (extracted.title) patch.title = stripHtml(extracted.title).slice(0, 200)
  if (extracted.description) patch.description = stripHtml(extracted.description).slice(0, 5000)
  if (extracted.vehicle_make) patch.vehicle_make = extracted.vehicle_make.slice(0, 100)
  if (extracted.vehicle_model) patch.vehicle_model = extracted.vehicle_model.slice(0, 100)
  if (extracted.vehicle_year) patch.vehicle_year = extracted.vehicle_year
  if (extracted.sleeps && extracted.sleeps > 0 && extracted.sleeps <= 20) {
    patch.sleeps = extracted.sleeps
  }
  if (extracted.seatbelts && extracted.seatbelts > 0 && extracted.seatbelts <= 20) {
    patch.seatbelts = extracted.seatbelts
  }
  if (extracted.length_label) patch.length_label = extracted.length_label.slice(0, 50)
  if (extracted.location_label) patch.location_label = extracted.location_label.slice(0, 200)

  // Guess vehicle class from title/model/description combined
  const classGuessSource = [extracted.vehicle_model, extracted.title, extracted.description]
    .filter(Boolean).join(' ')
  const guessedClass = guessVehicleClass(classGuessSource)
  if (guessedClass) patch.vehicle_class = guessedClass

  // Guess category
  const guessedCategory = guessCategory(extracted)
  if (guessedCategory) patch.category = guessedCategory

  // Amenity matching
  const matchedAmenities: Array<{ icon: string; label: string }> = []
  const unmatchedAmenities: string[] = []

  for (const raw of (extracted.amenity_strings ?? [])) {
    const matched = matchAmenity(raw)
    if (matched) {
      // Avoid duplicates
      if (!matchedAmenities.some((a) => a.label === matched)) {
        matchedAmenities.push({ icon: '', label: matched })
      }
    } else {
      unmatchedAmenities.push(raw)
    }
  }

  const pricePerNightDollars = extracted.price_per_night_dollars &&
    extracted.price_per_night_dollars > 0 &&
    extracted.price_per_night_dollars < 5000
    ? extracted.price_per_night_dollars
    : undefined

  return { patch, matchedAmenities, unmatchedAmenities, pricePerNightDollars }
}
