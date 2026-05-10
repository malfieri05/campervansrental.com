/**
 * Downloads external image URLs and re-uploads them to the listing-images
 * Supabase Storage bucket, then inserts listing_images rows.
 *
 * This module is server-only (no client Supabase calls).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImageRow } from '@/components/host/wizard/steps/PhotosStep'
import { IMPORT_BROWSER_USER_AGENT } from '@/lib/listing-import/user-agent'

const MAX_IMAGES = 10
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB per image
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const IMAGE_FETCH_TIMEOUT_MS = 10_000

async function downloadImage(url: string): Promise<{ buffer: Uint8Array; mimeType: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': IMPORT_BROWSER_USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!resp.ok) return null

    const contentType = (resp.headers.get('content-type') ?? '').split(';')[0].trim()
    const mimeType = ALLOWED_MIME.has(contentType) ? contentType : 'image/jpeg'

    const reader = resp.body?.getReader()
    if (!reader) {
      const buf = await resp.arrayBuffer()
      if (buf.byteLength > MAX_IMAGE_BYTES) return null
      return { buffer: new Uint8Array(buf), mimeType }
    }

    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_IMAGE_BYTES) { reader.cancel(); return null }
      chunks.push(value)
    }
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) { out.set(c, off); off += c.byteLength }
    return { buffer: out, mimeType }
  } catch {
    clearTimeout(timer)
    return null
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  }
  return map[mime] ?? 'jpg'
}

export async function importImagesToSupabase(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  urls: string[],
  existingSortOrderStart: number
): Promise<{ rows: ImageRow[]; warnings: string[] }> {
  const rows: ImageRow[] = []
  const warnings: string[] = []
  const candidates = Array.from(new Set(urls)).slice(0, MAX_IMAGES)

  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i]
    const downloaded = await downloadImage(url)
    if (!downloaded) {
      warnings.push(`Could not download image ${i + 1} of ${candidates.length}`)
      continue
    }

    const { buffer, mimeType } = downloaded
    const ext = mimeToExt(mimeType)
    const storagePath = `${userId}/${listingId}/imported-${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(storagePath, buffer, { upsert: false, contentType: mimeType })

    if (uploadError) {
      warnings.push(`Upload failed for image ${i + 1}: ${uploadError.message}`)
      continue
    }

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(storagePath)

    const sortOrder = existingSortOrderStart + rows.length

    const { data: insertedRow, error: dbError } = await supabase
      .from('listing_images')
      .insert({ listing_id: listingId, url: publicUrl, sort_order: sortOrder })
      .select('id, url, sort_order')
      .single()

    if (dbError || !insertedRow) {
      warnings.push(`DB insert failed for image ${i + 1}: ${dbError?.message ?? 'unknown'}`)
      continue
    }

    rows.push({
      id: insertedRow.id as string,
      url: insertedRow.url as string,
      sort_order: insertedRow.sort_order as number,
    })
  }

  return { rows, warnings }
}
