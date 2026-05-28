import type { Metadata } from 'next'
import { PLATFORM_BRAND_NAME } from '@/lib/company'
import { siteUrl } from '@/lib/env'
import type { Van } from '@/types'
import { vanPickupDisplay } from '@/lib/listing-public-pickup'

/** Canonical production domain — used when env is unset at build time. */
export const DEFAULT_SITE_ORIGIN = 'https://campervansrental.com'

export function getSiteOrigin(): string {
  const url = siteUrl()
  try {
    return new URL(url).origin
  } catch {
    return DEFAULT_SITE_ORIGIN
  }
}

export const SEO_KEYWORDS = [
  'camper van rental',
  'campervan rental',
  'rent a camper van',
  'camper van hire',
  'camper van rentals near me',
  'sprinter van rental',
  'class b camper van rental',
  'converted van rental',
  'van life rental',
  'peer to peer camper van rental',
  'camper van rental alternative to outdoorsy',
  'camper van rental alternative to rvezy',
  'direct camper van rental',
  'private camper van rental',
  'camper van road trip',
] as const

const DEFAULT_OG_IMAGE = '/rearvan.png'

const DEFAULT_DESCRIPTION =
  'Rent curated camper vans directly from verified owners. Lower transaction fees, real availability, and secure booking — the dedicated camper van rental marketplace at Camper Van Rentals.'

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin()
  if (path.startsWith('http')) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

/** Block indexing for authenticated / transactional routes. */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export function buildRootMetadata(): Metadata {
  const origin = getSiteOrigin()
  const title = `${PLATFORM_BRAND_NAME} | Rent Camper Vans — Peer-to-Peer Van Life`
  const description = DEFAULT_DESCRIPTION

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: `%s | ${PLATFORM_BRAND_NAME}`,
    },
    description,
    keywords: [...SEO_KEYWORDS],
    authors: [{ name: PLATFORM_BRAND_NAME, url: origin }],
    creator: PLATFORM_BRAND_NAME,
    publisher: PLATFORM_BRAND_NAME,
    category: 'travel',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: origin,
      siteName: PLATFORM_BRAND_NAME,
      title,
      description,
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          width: 1200,
          height: 630,
          alt: 'Camper van rental — explore van life on Camper Van Rentals',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export function buildHomeMetadata(): Metadata {
  const title = 'Rent a Camper Van | Peer-to-Peer Campervan Rentals'
  const description =
    'Book hand-picked camper vans for your next road trip. Lower transaction fees, real-time availability, and the same secure checkout and rental agreements you expect from a full-service marketplace.'

  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      url: absoluteUrl('/'),
    },
  }
}

export function buildFleetMetadata(): Metadata {
  const title = 'Browse Camper Vans for Rent'
  const description =
    'Explore our fleet of camper vans, sprinter conversions, and class B vans available to rent. Filter by location and dates — book your van life adventure without the markup of traditional RV rental sites.'

  return {
    title,
    description,
    alternates: { canonical: '/fleet' },
    openGraph: {
      title,
      description,
      url: absoluteUrl('/fleet'),
    },
  }
}

export function buildListingMetadata(van: Van): Metadata {
  const location = vanPickupDisplay(van)
  const title = `Rent ${van.name}${location ? ` — ${location}` : ''}`
  const description =
    van.description?.trim().slice(0, 155) ||
    `Rent this ${van.sleeps}-sleep camper van from $${van.pricePerNight}/night. ${van.tagline || 'Fully equipped for van life road trips.'} Book on ${PLATFORM_BRAND_NAME}.`

  const path = `/listings/${van.id}`
  const image = van.images[0] ? absoluteUrl(van.images[0]) : absoluteUrl(DEFAULT_OG_IMAGE)

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(path),
      images: [{ url: image, alt: `${van.name} — camper van rental` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export function buildOrganizationJsonLd() {
  const origin = getSiteOrigin()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PLATFORM_BRAND_NAME,
    url: origin,
    logo: absoluteUrl('/favicon.png'),
    email: 'support@campervansrental.com',
    description: DEFAULT_DESCRIPTION,
    sameAs: [] as string[],
  }
}

export function buildWebSiteJsonLd() {
  const origin = getSiteOrigin()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: PLATFORM_BRAND_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/fleet?location={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildWebPageJsonLd(args: {
  name: string
  description: string
  path: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.path),
    isPartOf: { '@type': 'WebSite', url: getSiteOrigin(), name: PLATFORM_BRAND_NAME },
  }
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function buildListingProductJsonLd(van: Van) {
  const location = vanPickupDisplay(van)
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    price: String(van.pricePerNight),
    priceCurrency: 'USD',
    availability: van.available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url: absoluteUrl(`/listings/${van.id}`),
    priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: van.name,
    description: van.description || van.tagline,
    image: van.images.length ? van.images.map((u) => absoluteUrl(u)) : [absoluteUrl(DEFAULT_OG_IMAGE)],
    category: 'Camper Van Rental',
    brand: { '@type': 'Brand', name: PLATFORM_BRAND_NAME },
    offers: offer,
  }

  if (location) {
    product.areaServed = location
  }

  if (van.reviewCount > 0 && van.rating > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(van.rating),
      reviewCount: String(van.reviewCount),
      bestRating: '5',
      worstRating: '1',
    }
  }

  return product
}

export function buildFaqPageJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export const HOME_SEO_FAQS = [
  {
    question: 'Why use a marketplace built only for camper vans?',
    answer:
      'General RV sites mix motorhomes, towables, and vans in one search. We list camper vans and conversions only, so travelers find the right rig faster. Our transaction fees are much lower than most large rental marketplaces — owners keep more of each booking, and renters get the same supported trip experience at a lower total cost.',
  },
  {
    question: 'What do renters get when they book here?',
    answer:
      'Verified listings, live availability, secure checkout, and a rental agreement on every trip — the same structure as a major booking platform, with lower service fees that reduce what you pay overall. Nightly rates and fees are shown before you commit, and you can compare class B vans, sprinter builds, and adventure rigs in one place.',
  },
  {
    question: 'What types of vans can I rent?',
    answer:
      'Class B camper vans, sprinter and transit conversions, adventure rigs, and premium van builds. Each listing shows sleeps, amenities, pickup area, and nightly rate so you can choose a van that fits your route and budget.',
  },
  {
    question: 'How do owners earn on the platform?',
    answer:
      'Create a listing with photos, pricing, and house rules, then sync your external calendar so booked dates stay accurate across channels. You keep a larger share of each trip because our transaction fees are much lower than typical marketplace rates. We handle checkout, payouts, rental agreements, and the booking flow renters expect.',
  },
] as const
