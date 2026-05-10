/**
 * Generic extraction pass: reads JSON-LD blocks and Open Graph / meta tags
 * from raw HTML without relying on any site-specific structure.
 */

import * as cheerio from 'cheerio'
import type { ExtractedListing } from './types'

// ─── JSON-LD helpers ──────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

function safeParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

/** Walk a JSON-LD graph node (could be nested @graph array) for a node we care about. */
function walkLd(node: unknown, visitor: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => walkLd(child, visitor))
    return
  }
  const obj = node as Record<string, unknown>
  visitor(obj)
  if (obj['@graph']) walkLd(obj['@graph'], visitor)
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>)['name'] === 'string') {
    return ((v as Record<string, unknown>)['name'] as string).trim() || undefined
  }
  return undefined
}

function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.]/g, ''))
    return isFinite(n) ? n : undefined
  }
  return undefined
}

/** Scrape image URLs from JSON-LD nodes (image / photo / logo). */
function imagesFromLd(obj: Record<string, unknown>): string[] {
  const urls: string[] = []
  for (const key of ['image', 'photo', 'thumbnail', 'logo']) {
    const v = obj[key]
    if (typeof v === 'string' && v.startsWith('http')) urls.push(v)
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && item.startsWith('http')) urls.push(item)
        if (typeof item === 'object' && item !== null) {
          const url = (item as Record<string, unknown>)['url']
          if (typeof url === 'string' && url.startsWith('http')) urls.push(url)
        }
      }
    }
    if (typeof v === 'object' && v !== null) {
      const url = (v as Record<string, unknown>)['url']
      if (typeof url === 'string' && url.startsWith('http')) urls.push(url)
    }
  }
  return urls
}

const RELEVANT_TYPES = new Set([
  'product', 'vehicle', 'car', 'automobile', 'lodgingbusiness',
  'vacation rental', 'offer', 'itemoffered',
])

function isRelevantType(obj: Record<string, unknown>): boolean {
  const t = obj['@type']
  if (!t) return false
  const types = (Array.isArray(t) ? t : [t]).map((s) => String(s).toLowerCase())
  return types.some((s) => RELEVANT_TYPES.has(s))
}

// ─── Main extractor ───────────────────────────────────────────────────────────

export function extractGeneric(html: string): ExtractedListing {
  const $ = cheerio.load(html)
  const result: ExtractedListing = {}

  // ── JSON-LD pass ──
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? ''
    const parsed = safeParseJson(raw)
    if (!parsed) return

    walkLd(parsed, (node) => {
      if (!isRelevantType(node)) return

      if (!result.title) result.title = getString(node, 'name')
      if (!result.description) result.description = getString(node, 'description')
      if (!result.vehicle_make) result.vehicle_make = getString(node, 'brand')
      if (!result.vehicle_model) result.vehicle_model = getString(node, 'model')

      if (!result.vehicle_year) {
        const y = getNumber(node, 'vehicleModelDate') ?? getNumber(node, 'modelDate')
        if (y && y > 1980 && y <= new Date().getFullYear() + 1) result.vehicle_year = y
      }

      // Occupancy / sleeps from LodgingBusiness / Product
      if (!result.sleeps) {
        const occ = node['occupancy']
        if (typeof occ === 'object' && occ !== null) {
          const max = getNumber(occ as Record<string, unknown>, 'maxValue')
            ?? getNumber(occ as Record<string, unknown>, 'value')
          if (max && max <= 20) result.sleeps = Math.round(max)
        }
        const seats = getNumber(node, 'seatingCapacity') ?? getNumber(node, 'numberOfRooms')
        if (seats && seats <= 20) result.sleeps = result.sleeps ?? Math.round(seats)
      }

      // Price from Offer
      const offersNode = node['offers']
      if (!result.price_per_night_dollars && offersNode && typeof offersNode === 'object' && !Array.isArray(offersNode)) {
        const offerObj = offersNode as Record<string, unknown>
        const price = getNumber(offerObj, 'price') ?? getNumber(offerObj, 'lowPrice')
        if (price && price > 0 && price < 50000) result.price_per_night_dollars = price
      }

      // Images
      const imgs = imagesFromLd(node)
      if (imgs.length) {
        result.image_urls = [...(result.image_urls ?? []), ...imgs]
      }
    })
  })

  // ── Open Graph + meta pass ──
  const ogTitle = $('meta[property="og:title"]').attr('content')
    ?? $('meta[name="twitter:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
    ?? $('meta[name="twitter:description"]').attr('content')
    ?? $('meta[name="description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
    ?? $('meta[name="twitter:image"]').attr('content')

  if (!result.title && ogTitle) result.title = ogTitle.trim()
  if (!result.description && ogDesc) result.description = ogDesc.trim()
  if (ogImage?.startsWith('http')) {
    result.image_urls = Array.from(new Set([ogImage, ...(result.image_urls ?? [])]))
  }

  // ── <title> tag fallback ──
  if (!result.title) {
    const rawTitle = $('title').first().text().trim()
    if (rawTitle) result.title = rawTitle
  }

  // ── Deduplicate images ──
  if (result.image_urls) {
    result.image_urls = Array.from(new Set(result.image_urls)).filter((u) => u.startsWith('http'))
  }

  return result
}
