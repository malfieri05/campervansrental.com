import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import VanCard from '@/components/fleet/VanCard'
import { Van } from '@/types'

export default function FleetPageClient({ listings }: { listings: Van[] }) {
  return (
    <div className="min-h-screen bg-cream-100 -mt-20">
      <section className="relative h-72 md:h-96 flex items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1920"
          alt="Fleet of luxury camper vans"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/60 to-forest-950/20" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 pb-12">
          <h1
            className="font-serif text-cream-50 font-bold"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)' }}
          >
            Our Fleet
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 rounded"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />
          Home
        </Link>

        {listings.length > 0 ? (
          <>
            <p className="font-sans text-sm text-charcoal/40 mb-8">
              Showing {listings.length} van{listings.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((van) => (
                <VanCard key={van.id} van={van} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-charcoal/40 mb-3">No vans in the fleet yet</p>
            <p className="font-sans text-sm text-charcoal/30">
              Check back soon or publish a listing from the host dashboard.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
