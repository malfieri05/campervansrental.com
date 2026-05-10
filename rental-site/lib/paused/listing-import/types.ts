import type { ListingDraftInput } from '@/app/host/listings/actions'
import type { ImageRow } from '@/components/host/wizard/steps/PhotosStep'

/** Raw data extracted from an external listing page. All fields optional. */
export interface ExtractedListing {
  title?: string
  description?: string
  /** Year as a number, e.g. 2020 */
  vehicle_year?: number
  vehicle_make?: string
  vehicle_model?: string
  /** Human-readable length string, e.g. "22 ft" */
  length_label?: string
  sleeps?: number
  seatbelts?: number
  /** Nightly price in whole dollars */
  price_per_night_dollars?: number
  /** Absolute image URLs */
  image_urls?: string[]
  /** Raw amenity strings from the source page */
  amenity_strings?: string[]
  /** Location/city label */
  location_label?: string
}

export interface ListingImportResult {
  ok: boolean
  error?: string
  /** DB field names that were written */
  appliedFields: string[]
  /** DB field names skipped (value already set) */
  skippedFields: string[]
  /** Non-fatal notes for the host */
  warnings: string[]
  /** Patch that was applied to the listing row */
  listingPatch: Partial<ListingDraftInput>
  /** Inserted image rows with real IDs from the DB */
  newImages: ImageRow[]
}
