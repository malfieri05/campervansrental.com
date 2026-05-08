import Link from 'next/link'
import SiteLogo from '@/components/layout/SiteLogo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-forest-950 text-cream-100">
      {/* Top edge */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Faint divider above the sole footer row */}
        <div className="h-px bg-gradient-to-r from-transparent via-forest-700/80 to-transparent" />

        {/* Mobile: single centered column. sm+: three-column row */}
        <div className="py-8 pb-4 flex flex-col items-center gap-4 sm:grid sm:grid-cols-3 sm:items-center sm:gap-8">
          <p className="text-xs font-sans text-cream-200/40 text-center sm:text-left order-3 sm:order-1">
            © {year} Camper Van Rentals. All rights reserved.
          </p>

          <p className="font-serif text-sm italic text-cream-50/90 sm:text-base text-center leading-snug order-1 sm:order-2">
            Made for the modern explorer
          </p>

          <div className="flex justify-center sm:justify-end order-2 sm:order-3">
            <Link
              href="/"
              className="group inline-flex w-fit transition-opacity group-hover:opacity-90"
            >
              <SiteLogo textOnly />
            </Link>
          </div>
        </div>

        <p className="pb-8 text-center font-sans text-xs italic text-cream-200/35">
          Built by{' '}
          <a
            href="https://www.arksolutions.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-[3px] transition-colors hover:text-gold-400/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-950 rounded-sm"
          >
            ARK Solutions
          </a>
        </p>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-transparent via-gold-600/40 to-transparent" />
    </footer>
  )
}
