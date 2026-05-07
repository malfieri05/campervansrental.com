import Link from 'next/link'
import { Truck, Instagram, Facebook, Youtube } from 'lucide-react'

const footerLinks = {
  company: {
    heading: 'Company',
    links: [
      { label: 'Our Fleet', href: '/fleet' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  destinations: {
    heading: 'Destinations',
    links: [
      { label: 'National Parks', href: '/destinations/national-parks' },
      { label: 'Pacific Coast', href: '/destinations/pacific-coast' },
      { label: 'Rocky Mountains', href: '/destinations/rocky-mountains' },
      { label: 'Desert Southwest', href: '/destinations/desert-southwest' },
    ],
  },
  support: {
    heading: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Booking Policy', href: '/booking-policy' },
      { label: 'Insurance', href: '/insurance' },
    ],
  },
  legal: {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Sitemap', href: '/sitemap' },
    ],
  },
}

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
  {
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    label: 'Reddit',
    href: 'https://reddit.com',
  },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
]

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-100">
      {/* Gold top divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Upper Footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
              <div className="w-9 h-9 bg-gold-400 flex items-center justify-center rounded-sm group-hover:bg-gold-300 transition-colors duration-300">
                <Truck className="w-5 h-5 text-forest-950" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-cream-50 font-semibold text-base leading-tight tracking-wide">
                  Camper Van
                </span>
                <span className="font-display text-gold-400 text-[0.6rem] font-bold uppercase tracking-[0.2em] leading-tight">
                  Rentals
                </span>
              </div>
            </Link>
            <p className="font-serif italic text-cream-200/70 text-base leading-relaxed max-w-xs">
              Adventure in luxury. Explore the world differently.
            </p>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.heading} className="lg:col-span-1">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-gold-400 mb-5">
                {section.heading}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream-200/60 hover:text-cream-100 font-sans transition-colors duration-200 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Gold divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-forest-700/80 to-transparent" />

        {/* Bottom Footer */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-200/40 font-sans">
            © 2025 Camper Van Rentals. All rights reserved.
          </p>
          <p className="text-xs text-cream-200/30 font-serif italic hidden sm:block">
            Made for the modern explorer
          </p>
          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cream-200/40 hover:text-gold-400 transition-colors duration-200"
                >
                  <Icon className="w-5 h-5" />
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom gold accent */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-gold-600/40 to-transparent" />
    </footer>
  )
}
