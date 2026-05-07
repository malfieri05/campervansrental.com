import { Van, Testimonial } from '@/types'

export const vans: Van[] = [
  {
    id: 'the-wanderer',
    name: 'The Wanderer',
    tagline: 'Timeless elegance meets open road freedom',
    description:
      'The Wanderer is our original classic — a beautifully restored and reimagined luxury van that blends vintage Airstream-inspired aesthetics with thoroughly modern comforts. Every detail has been curated for the discerning traveler who appreciates craftsmanship and refinement without sacrificing adventure.',
    images: [
      'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
      'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800',
    ],
    pricePerNight: 285,
    sleeps: 2,
    length: '20ft',
    features: [
      'Hand-stitched leather seating',
      'Heated hardwood floors',
      'Rainfall shower with pebble tile',
      'Queen memory foam mattress',
      'Curated vinyl record collection',
      'Artisan espresso machine',
      'Cedar-lined wardrobe',
      'LED mood lighting system',
      'Bluetooth surround sound',
      'Skylark stargazing window',
    ],
    amenities: [
      { icon: 'Wifi', label: 'High-Speed WiFi' },
      { icon: 'Zap', label: '200W Solar Panel' },
      { icon: 'Thermometer', label: 'Climate Control' },
      { icon: 'Coffee', label: 'Espresso Machine' },
      { icon: 'Tv', label: '32" Smart TV' },
      { icon: 'ShowerHead', label: 'Rainfall Shower' },
    ],
    category: 'classic',
    available: true,
    rating: 4.9,
    reviewCount: 127,
    location: 'Denver, CO',
  },
  {
    id: 'the-expedition',
    name: 'The Expedition',
    tagline: 'Built for those who dare to go further',
    description:
      'The Expedition is engineered for the adventure-minded explorer who refuses to sacrifice comfort when venturing off the beaten path. With all-terrain capabilities, full off-grid power systems, and a rugged-yet-refined interior, this van takes you to places others cannot reach — in complete luxury.',
    images: [
      'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800',
      'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800',
      'https://images.unsplash.com/photo-1534791440912-be3a96b0f8d4?w=800',
    ],
    pricePerNight: 385,
    sleeps: 3,
    length: '24ft',
    features: [
      '4WD all-terrain suspension',
      'Rooftop tent for extra guest',
      'Outdoor shower station',
      'Full solar array — 400W system',
      'Lift-top kitchen workspace',
      'Built-in trail navigation system',
      'Heated seats and steering wheel',
      'Stargazing skylight hatch',
      'Stainless chef\'s camp kitchen',
      'Gear storage and bike rack',
    ],
    amenities: [
      { icon: 'Wifi', label: 'Satellite WiFi' },
      { icon: 'Zap', label: '400W Solar + Battery' },
      { icon: 'Mountain', label: '4WD Capable' },
      { icon: 'Flame', label: 'Outdoor Grill Station' },
      { icon: 'Camera', label: 'Action Cam Kit Included' },
      { icon: 'ShowerHead', label: 'Outdoor Shower' },
    ],
    category: 'adventure',
    available: true,
    rating: 4.8,
    reviewCount: 89,
    location: 'Salt Lake City, UT',
  },
  {
    id: 'the-summit',
    name: 'The Summit',
    tagline: 'Where premium living meets mountain air',
    description:
      'The Summit is our flagship full-size luxury van — a masterpiece of mobile living that sleeps four in extraordinary comfort. The king and bunk configuration, full-height ceilings, and spa-quality bathroom make this the gold standard of van travel. For families and groups who demand the very best.',
    images: [
      'https://images.unsplash.com/photo-1534791440912-be3a96b0f8d4?w=800',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=800',
      'https://images.unsplash.com/photo-1544161513-0179fe746fd5?w=800',
    ],
    pricePerNight: 495,
    sleeps: 4,
    length: '28ft',
    features: [
      'Full-height standing interior',
      'King bed + convertible bunk beds',
      'Spa-quality bathroom with tub',
      'Chef\'s kitchen — 3 burner + oven',
      'Heated marble bathroom floors',
      'Full-size washer/dryer unit',
      'Panoramic roof deck',
      'Automatic leveling system',
      'Generator + 600W solar hybrid',
      'Concierge pre-stocking service',
    ],
    amenities: [
      { icon: 'Wifi', label: 'High-Speed WiFi' },
      { icon: 'Zap', label: '600W Solar Hybrid' },
      { icon: 'Thermometer', label: 'Dual-Zone Climate' },
      { icon: 'Coffee', label: 'Full Coffee Bar' },
      { icon: 'Tv', label: '55" Smart TV' },
      { icon: 'Waves', label: 'Full Bathtub' },
    ],
    category: 'luxury',
    available: true,
    rating: 4.9,
    reviewCount: 203,
    location: 'Bozeman, MT',
  },
  {
    id: 'the-monarch',
    name: 'The Monarch',
    tagline: 'The pinnacle of luxury van travel',
    description:
      'The Monarch is the crown jewel of our fleet — an ultra-luxury mobile estate that redefines what is possible on the open road. Custom-built to our exacting standards, it features materials sourced from the world\'s finest craftsmen, a professional kitchen, and technology that rivals a five-star hotel. This is not van travel. This is an experience.',
    images: [
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=800',
      'https://images.unsplash.com/photo-1534791440912-be3a96b0f8d4?w=800',
      'https://images.unsplash.com/photo-1544161513-0179fe746fd5?w=800',
    ],
    pricePerNight: 750,
    sleeps: 4,
    length: '30ft',
    features: [
      'Hand-selected Italian marble surfaces',
      'Cashmere bedding — 800 thread count',
      'Professional chef\'s kitchen',
      'Private master suite with en-suite',
      'Glass wine cellar — 18 bottle',
      'Automated blackout curtains',
      'Full concierge service included',
      'Personal chef available on request',
      '1000W solar + lithium battery bank',
      'Starlink satellite internet',
    ],
    amenities: [
      { icon: 'Wifi', label: 'Starlink Internet' },
      { icon: 'Zap', label: '1000W Solar System' },
      { icon: 'Thermometer', label: 'Multi-Zone Climate' },
      { icon: 'Wine', label: 'Wine Cellar Onboard' },
      { icon: 'Tv', label: '65" OLED Smart TV' },
      { icon: 'Star', label: 'Concierge Included' },
    ],
    category: 'ultra-luxury',
    available: true,
    rating: 4.9,
    reviewCount: 64,
    location: 'Aspen, CO',
  },
]

export const testimonials: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Samantha & James R.',
    location: 'San Francisco, CA',
    rating: 5,
    text: 'We have stayed in five-star hotels around the world, but our week in The Summit through Glacier National Park was genuinely the most extraordinary travel experience of our lives. Waking up to mountain views from a king bed, making coffee in a fully-stocked kitchen, then hiking all day — it was flawless. We are already planning our next trip.',
    trip: 'Glacier National Park — 7 nights in The Summit',
  },
  {
    id: 'testimonial-2',
    name: 'Marcus T.',
    location: 'Austin, TX',
    rating: 5,
    text: 'I was skeptical that a van could feel genuinely luxurious, but The Monarch proved me completely wrong. From the moment we picked it up — immaculately detailed, fully stocked with our requested groceries, with a personalized route suggestion from the team — it was clear this was something different. The stargazing from the roof deck in Big Bend was unforgettable.',
    trip: 'Big Bend & Texas Hill Country — 10 nights in The Monarch',
  },
  {
    id: 'testimonial-3',
    name: 'Priya & Dev K.',
    location: 'Chicago, IL',
    rating: 5,
    text: 'The Expedition was the perfect choice for our anniversary trip through the Rockies. We drove unpaved mountain passes, found hidden hot springs, and slept under more stars than I knew existed — all while sleeping on the most comfortable mattress and showering in an outdoor shower at sunrise. The Camper Van Rentals team thought of absolutely everything.',
    trip: 'Colorado Rockies Circuit — 8 nights in The Expedition',
  },
]

export const getCategoryLabel = (category: Van['category']): string => {
  const labels: Record<Van['category'], string> = {
    classic: 'Classic',
    adventure: 'Adventure',
    luxury: 'Luxury',
    'ultra-luxury': 'Ultra-Luxury',
  }
  return labels[category]
}

/** Ensures a numeric length always displays with a feet suffix (e.g. "22" → "22 ft", "22ft" → "22 ft"). */
export function formatVanLengthFt(length: string | null | undefined): string | null {
  const raw = length?.trim()
  if (!raw) return null
  const core = raw
    .replace(/\s*ft\.?\s*$/i, '')
    .replace(/\s*feet\s*$/i, '')
    .replace(/\s*'\s*$/, '')
    .trim()
  if (/^\d+(\.\d+)?$/.test(core)) {
    return `${core} ft`
  }
  return raw
}

export const getVanById = (id: string): Van | undefined => {
  return vans.find((van) => van.id === id)
}
