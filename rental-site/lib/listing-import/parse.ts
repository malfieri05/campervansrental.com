/**
 * Merge chain: domain-specific adapter first, then generic JSON-LD/meta pass.
 * Any field not found by the adapter is filled by the generic extractor.
 */

import type { ExtractedListing } from './types'
import { extractGeneric } from './extract-generic'
import { extractOutdoorsy } from './adapters/outdoorsy'
import { extractRvezy } from './adapters/rvezy'

function getRootDomain(hostname: string): string {
  return hostname.replace(/^www\./, '').split('.').slice(-2).join('.')
}

/** Merge b into a: only fill keys that are absent/empty in a. */
function mergeExtracted(a: ExtractedListing, b: ExtractedListing): ExtractedListing {
  const out = { ...a }
  for (const k of Object.keys(b) as (keyof ExtractedListing)[]) {
    const bv = b[k]
    const av = out[k]
    if (bv === undefined || bv === null) continue
    if (av === undefined || av === null) {
      // @ts-expect-error dynamic key assignment
      out[k] = bv
      continue
    }
    // Merge arrays
    if (Array.isArray(av) && Array.isArray(bv)) {
      const merged = Array.from(new Set([...av, ...bv]))
      // @ts-expect-error dynamic key assignment
      out[k] = merged
    }
  }
  return out
}

export function parseListingHtml(html: string, sourceUrl: string): ExtractedListing {
  let hostname: string
  try { hostname = new URL(sourceUrl).hostname } catch { hostname = '' }

  const root = getRootDomain(hostname)

  let adapterResult: ExtractedListing = {}
  if (root === 'outdoorsy.com') {
    adapterResult = extractOutdoorsy(html)
  } else if (root === 'rvezy.com') {
    adapterResult = extractRvezy(html)
  }

  const genericResult = extractGeneric(html)

  // Adapter result has priority; generic fills gaps
  return mergeExtracted(adapterResult, genericResult)
}
