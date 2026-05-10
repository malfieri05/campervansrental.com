'use server'

/** PAUSED: Outdoorsy/RVezy URL import — not mounted in UI. Wire `wizard/paused/ImportFromUrlCard` from HostListingWizard to revive. */

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchListingHtml } from '@/lib/paused/listing-import/ssrf'
import { parseListingHtml } from '@/lib/paused/listing-import/parse'
import { normalizeExtracted } from '@/lib/paused/listing-import/normalize'
import { mergeEmptyFields } from '@/lib/paused/listing-import/merge'
import { importImagesToSupabase } from '@/lib/paused/listing-import/images'
import type { ListingImportResult } from '@/lib/paused/listing-import/types'

export async function importListingFromExternalUrl(
  listingId: string,
  rawUrl: string
): Promise<ListingImportResult> {
  const empty: ListingImportResult = {
    ok: false,
    appliedFields: [],
    skippedFields: [],
    warnings: [],
    listingPatch: {},
    newImages: [],
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ...empty, error: 'Database not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...empty, error: 'Unauthorized' }

  // ── Verify ownership ──────────────────────────────────────────────────────
  const { data: row, error: rowErr } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .single()

  if (rowErr || !row) return { ...empty, error: 'Listing not found' }

  // ── Fetch HTML ────────────────────────────────────────────────────────────
  let html: string
  try {
    html = await fetchListingHtml(rawUrl.trim())
  } catch (err: unknown) {
    return { ...empty, error: err instanceof Error ? err.message : String(err) }
  }

  if (!html || html.length < 200) {
    return { ...empty, error: 'The listing page returned too little content to import from' }
  }

  // ── Parse + normalize ─────────────────────────────────────────────────────
  const extracted = parseListingHtml(html, rawUrl)
  const { patch: normalized, matchedAmenities, unmatchedAmenities, pricePerNightDollars } =
    normalizeExtracted(extracted)

  const warnings: string[] = []
  if (unmatchedAmenities.length > 0) {
    warnings.push(
      `${unmatchedAmenities.length} amenities couldn't be matched to known options: ${unmatchedAmenities.slice(0, 5).join(', ')}${unmatchedAmenities.length > 5 ? '…' : ''}`
    )
  }

  // ── Merge-empty ───────────────────────────────────────────────────────────
  const { patch, appliedFields, skippedFields } = mergeEmptyFields(
    listingId,
    row as Record<string, unknown>,
    normalized,
    matchedAmenities,
    pricePerNightDollars
  )

  // ── Persist text patch ────────────────────────────────────────────────────
  if (appliedFields.length > 0) {
    const { id: _id, ...patchWithoutId } = patch
    const { error: updateErr } = await supabase
      .from('listings')
      .update({ ...patchWithoutId, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('owner_id', user.id)

    if (updateErr) {
      return { ...empty, error: `Failed to save imported data: ${updateErr.message}` }
    }
  }

  // ── Images pipeline ───────────────────────────────────────────────────────
  const existingImagesCount = (
    await supabase.from('listing_images').select('id', { count: 'exact', head: true }).eq('listing_id', listingId)
  ).count ?? 0

  const imageUrls = (extracted.image_urls ?? []).slice(0, 10)
  let newImages: ListingImportResult['newImages'] = []

  if (imageUrls.length > 0) {
    const { rows, warnings: imgWarnings } = await importImagesToSupabase(
      supabase,
      user.id,
      listingId,
      imageUrls,
      existingImagesCount
    )
    newImages = rows
    warnings.push(...imgWarnings)
    if (rows.length > 0) appliedFields.push(`images (${rows.length})`)
  }

  // ── Revalidate ────────────────────────────────────────────────────────────
  revalidatePath(`/host/listings/${listingId}/edit`)

  // ── Summary warning if very little was extracted ──────────────────────────
  if (appliedFields.length === 0 && newImages.length === 0) {
    warnings.push(
      'We couldn\'t extract much from this listing page. The page may require a browser to load or the content may be protected.'
    )
  }

  console.log(`[listing-import] listingId=${listingId} domain=${new URL(rawUrl).hostname} applied=${appliedFields.join(',')} images=${newImages.length}`)

  return {
    ok: true,
    appliedFields,
    skippedFields,
    warnings,
    listingPatch: patch,
    newImages,
  }
}
