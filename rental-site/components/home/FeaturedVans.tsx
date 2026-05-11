import VanCard from '@/components/fleet/VanCard'
import Button from '@/components/ui/Button'
import type { Van } from '@/types'

interface Props {
  listings: Van[]
}

export default function FeaturedVans({ listings }: Props) {
  return (
    <section className="bg-cream-100 py-14 sm:py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              Our Curated Fleet
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400" />
          </div>
        </div>

        {listings.length === 0 ? (
          <p className="text-center font-sans text-sm text-charcoal/55 mb-14 max-w-md mx-auto">
            No vans match your dates, guest count, or location. Try adjusting your search above.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {listings.map((van) => (
              <VanCard key={van.id} van={van} />
            ))}
          </div>
        )}

        {/* View Full Fleet CTA */}
        <div className="text-center pb-4 sm:pb-0">
          <Button href="/fleet" variant="dark" size="lg">
            View Full Fleet
          </Button>
        </div>
      </div>
    </section>
  )
}
