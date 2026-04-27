/**
 * Unsplash stock image URLs used in host wizard tip cards.
 * These are already whitelisted in next.config.js via images.unsplash.com.
 * Swap any entry for /public/host-tips/*.jpg later without changing components.
 */
export const TIP_IMAGES = {
  details:
    'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=600&q=80',
  photos:
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80',
  amenities:
    'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=600&q=80',
  pricing:
    'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=600&q=80',
  delivery:
    'https://images.unsplash.com/photo-1508558936510-0af1e3cccbab?w=600&q=80',
  policies:
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80',
  profitPlan:
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
} as const
