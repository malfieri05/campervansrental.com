import Stripe from 'stripe'
import { isStripeConfigured } from '@/lib/env'

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
  })
}
