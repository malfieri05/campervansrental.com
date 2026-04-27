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
  location: string
  /** From DB listing row; defaults used in UI when absent */
  cleaningFeeCents?: number
  insuranceFeeCents?: number
  rules?: Record<string, unknown>
  // Extended content fields
  whatsIncluded?: string | null
  faqs?: FAQ[]
  tripRecommendations?: string | null
  youtubeVideoUrl?: string | null
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
