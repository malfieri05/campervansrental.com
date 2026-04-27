import { Suspense } from 'react'
import CheckoutClient from '@/components/checkout/CheckoutClient'

export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 pt-8 px-6 font-sans text-charcoal/60">
          Loading checkout…
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  )
}
