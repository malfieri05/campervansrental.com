export interface FAQ {
  id: string
  question: string
  answer: string
}

export interface Van {
  /** URL slug (matches legacy static ids or DB slug) */
  id: string
  /** When loaded from Supabase, the listing row UUID for checkout and APIs */
  listingUuid?: string | null
  name: string
  tagline: string
  description: string
  images: string[]
  pricePerNight: number
  sleeps: number
  length: string
  features: string[]
  amenities: Amenity[]
  category: 'classic' | 'adventure' | 'luxury' | 'ultra-luxury'
  available: boolean
  rating: number
  reviewCount: number
  /** Marketplace / search region (e.g. metro filter on home). */
  location: string
  /**
   * When the host saved structured address, city + state/region for renter-facing
   * pickup copy (no street). Prefer `vanPickupDisplay()` in UI; omit for static demo vans.
   */
  pickupAreaPublic?: string | null
  /** From DB listing row; defaults used in UI when absent */
  cleaningFeeCents?: number
  insuranceFeeCents?: number
  /** Held at pickup (not part of the 25% reservation fee); refundable per host policy */
  securityDepositCents?: number
  minNights?: number
  viewCount?: number
  rules?: Record<string, unknown>
  // Extended content fields
  whatsIncluded?: string | null
  faqs?: FAQ[]
  tripRecommendations?: string | null
  youtubeVideoUrl?: string | null
  /** Optional host pickup / drop-off copy shown on listing detail */
  pickupDropoffRulesText?: string | null
  /** Optional URL to uploaded rules PDF/image */
  pickupDropoffRulesDocUrl?: string | null
  /** Whether host has enabled the per-listing chatbot */
  listingChatbotEnabled?: boolean
  /** Host cancellation tier from listings.cancellation_policy (Outdoorsy-style presets). */
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict' | null
}

export interface Amenity {
  icon: string
  label: string
}

export interface Booking {
  vanId: string
  startDate: Date
  endDate: Date
  guests: number
  totalPrice: number
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface Testimonial {
  id: string
  name: string
  location: string
  rating: number
  text: string
  trip: string
  avatar?: string
}
