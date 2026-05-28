import type { MetadataRoute } from 'next'
import { getPublishedListings } from '@/lib/listings'
import { getSiteOrigin } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: origin, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/fleet`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${origin}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let listingRoutes: MetadataRoute.Sitemap = []
  try {
    const listings = await getPublishedListings()
    listingRoutes = listings.map((van) => ({
      url: `${origin}/listings/${encodeURIComponent(van.id)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    listingRoutes = []
  }

  return [...staticRoutes, ...listingRoutes]
}
