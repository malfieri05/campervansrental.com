/**
 * Merge-empty strategy: apply a scraped patch to a listing row only where
 * the current value is effectively empty/default.
 */

import type { ListingDraftInput } from '@/app/host/listings/actions'
import type { AmenityItem } from '@/components/host/wizard/steps/AmenitiesStep'

type DBRow = Record<string, unknown>

const DEFAULT_TITLE = 'New listing'

/** Returns true if the current DB value for a given key should be treated as "empty". */
function isEmpty(key: string, row: DBRow): boolean {
  const v = row[key]
  switch (key) {
    case 'title':
      return !v || v === DEFAULT_TITLE
    case 'description':
    case 'tagline':
    case 'vehicle_make':
    case 'vehicle_model':
    case 'length_label':
    case 'location_label':
    case 'address_city':
    case 'address_state':
      return !v || (typeof v === 'string' && v.trim() === '')
    case 'vehicle_year':
      return v === null || v === undefined || v === 0
    case 'sleeps':
      // Default seeded as 2 — treat 2 and below as "not explicitly set" only when other fields also empty
      return v === null || v === undefined
    case 'seatbelts':
      return v === null || v === undefined || v === 0
    case 'vehicle_class':
      return !v || v === 'Class B / Campervan'
    case 'category':
      return !v || v === 'classic'
    case 'price_per_night_cents':
      return !v || Number(v) === 19900  // default seed value
    case 'amenities':
      return !v || (Array.isArray(v) && v.length === 0)
    default:
      return !v || (typeof v === 'string' && v.trim() === '')
  }
}

export type MergeResult = {
  patch: Partial<ListingDraftInput>
  appliedFields: string[]
  skippedFields: string[]
}

/**
 * Builds the subset of `proposed` that is safe to write without overwriting
 * host-entered data. Returns the patch plus applied/skipped field lists.
 */
export function mergeEmptyFields(
  listingId: string,
  row: DBRow,
  proposed: Partial<Omit<ListingDraftInput, 'id'>>,
  newAmenities: AmenityItem[],
  pricePerNightDollars: number | undefined
): MergeResult {
  const patch: Partial<ListingDraftInput> = { id: listingId }
  const appliedFields: string[] = []
  const skippedFields: string[] = []

  function tryApply(key: string, value: unknown) {
    if (value === undefined || value === null) return
    if (isEmpty(key, row)) {
      // @ts-expect-error dynamic key assignment
      patch[key] = value
      appliedFields.push(key)
    } else {
      skippedFields.push(key)
    }
  }

  tryApply('title', proposed.title)
  tryApply('description', proposed.description)
  tryApply('vehicle_make', proposed.vehicle_make)
  tryApply('vehicle_model', proposed.vehicle_model)
  tryApply('vehicle_year', proposed.vehicle_year)
  tryApply('sleeps', proposed.sleeps)
  tryApply('seatbelts', proposed.seatbelts)
  tryApply('length_label', proposed.length_label)
  tryApply('vehicle_class', proposed.vehicle_class)
  tryApply('category', proposed.category)
  tryApply('location_label', proposed.location_label)

  if (pricePerNightDollars && isEmpty('price_per_night_cents', row)) {
    patch.price_per_night_cents = pricePerNightDollars * 100
    appliedFields.push('price_per_night_cents')
  } else if (pricePerNightDollars) {
    skippedFields.push('price_per_night_cents')
  }

  // Amenities: merge-append to existing list (avoid duplicates by label)
  if (newAmenities.length > 0) {
    const existing: AmenityItem[] = Array.isArray(row['amenities'])
      ? (row['amenities'] as AmenityItem[])
      : []
    const existingLabels = new Set(existing.map((a) => a.label))
    const toAdd = newAmenities.filter((a) => !existingLabels.has(a.label))
    if (toAdd.length > 0) {
      patch.amenities = [...existing, ...toAdd]
      appliedFields.push('amenities')
    } else {
      skippedFields.push('amenities')
    }
  }

  return { patch, appliedFields, skippedFields }
}
