import Image from 'next/image'
import Link from 'next/link'
import { Star, Users, Ruler, ArrowRight } from 'lucide-react'
import { Van } from '@/types'
import { getCategoryLabel } from '@/lib/data'

interface VanCardProps {
  van: Van
}

const categoryColors: Record<Van['category'], string> = {
  classic: 'bg-cream-200 text-forest-800',
  adventure: 'bg-forest-100 text-forest-800',
  luxury: 'bg-gold-100 text-gold-800',
  'ultra-luxury': 'bg-gold-200 text-gold-900',
}

export default function VanCard({ van }: VanCardProps) {
  return (
    <Link
      href={`/listings/${van.id}`}
      className={[
        'group block bg-cream-50 rounded-sm overflow-hidden border border-cream-300/50',
        'shadow-luxury-sm translate-y-0 transition-all duration-400',
        'hover:shadow-luxury hover:-translate-y-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100',
      ].join(' ')}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={van.images[0]}
          alt={van.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span
            className={[
              'font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full',
              categoryColors[van.category],
            ].join(' ')}
          >
            {getCategoryLabel(van.category)}
          </span>
        </div>

        {/* Rating overlay */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-forest-950/70 backdrop-blur-sm rounded-sm px-2.5 py-1.5">
          <Star className="w-3.5 h-3.5 text-gold-400" fill="#e0a82a" />
          <span className="font-display text-xs font-bold text-cream-100">
            {van.rating}
          </span>
          <span className="font-sans text-[0.65rem] text-cream-200/60">
            ({van.reviewCount})
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Name + Tagline */}
        <div className="mb-4">
          <h3 className="font-serif text-xl font-semibold text-charcoal mb-1.5 group-hover:text-forest-700 transition-colors duration-200">
            {van.name}
          </h3>
          <p className="font-sans text-sm text-charcoal/55 leading-snug">
            {van.tagline}
          </p>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-gradient-to-r from-gold-400/40 via-gold-400/20 to-transparent mb-4" />

        {/* Specs Row */}
        <div className="flex items-center gap-5 mb-5">
          <div className="flex items-center gap-1.5 text-forest-700">
            <Users className="w-3.5 h-3.5" />
            <span className="font-sans text-xs font-medium">
              Sleeps {van.sleeps}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-forest-700">
            <Ruler className="w-3.5 h-3.5" />
            <span className="font-sans text-xs font-medium">{van.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-charcoal/50">
            <span className="font-sans text-xs">{van.location}</span>
          </div>
        </div>

        {/* Features preview */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {van.features.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="font-sans text-[0.65rem] text-forest-700 bg-forest-50 border border-forest-200/50 px-2 py-1 rounded-sm"
            >
              {feature}
            </span>
          ))}
          {van.features.length > 3 && (
            <span className="font-sans text-[0.65rem] text-charcoal/40 bg-cream-100 border border-cream-300/50 px-2 py-1 rounded-sm">
              +{van.features.length - 3} more
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-serif text-2xl font-semibold text-gold-500">
              ${van.pricePerNight.toLocaleString()}
            </span>
            <span className="font-sans text-xs text-charcoal/40 ml-1">
              / night
            </span>
          </div>
          <span className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-forest-700 group-hover:text-gold-500 transition-colors duration-200">
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </div>
      </div>
    </Link>
  )
}
