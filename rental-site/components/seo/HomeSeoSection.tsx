import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import { HOME_SEO_FAQS, buildFaqPageJsonLd } from '@/lib/seo'

/**
 * Crawlable, keyword-rich copy + FAQ for homepage SEO (camper van rental intent).
 */
export default function HomeSeoSection() {
  return (
    <section
      id="camper-van-rentals"
      className="border-t border-cream-300/60 bg-cream-100 px-6 py-14 sm:py-20 lg:px-10"
      aria-labelledby="seo-section-heading"
    >
      <JsonLd data={buildFaqPageJsonLd([...HOME_SEO_FAQS])} />

      <div className="mx-auto max-w-3xl">
        <h2
          id="seo-section-heading"
          className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl"
        >
          The camper van rental marketplace built for van life
        </h2>
        <div className="mt-6 space-y-4 font-sans text-base leading-relaxed text-charcoal/70">
          <p>
            <strong className="font-medium text-charcoal">Camper Van Rentals</strong> is a
            peer-to-peer platform where travelers rent camper vans, sprinter conversions, and class B
            rigs directly from owners — without wading through motorhomes and travel trailers on
            general RV sites like Outdoorsy, RVezy, or RV Trader.
          </p>
          <p>
            Whether you are replacing a risky Facebook Marketplace deal or comparing options beyond
            big aggregators, you get transparent nightly pricing, synced calendars, secure payments,
            and rental agreements on every trip.
          </p>
          <p>
            <Link href="/fleet" className="font-medium text-forest-700 underline hover:text-forest-600">
              Browse camper vans for rent
            </Link>{' '}
            by location and dates, or{' '}
            <Link
              href="/auth/signup?next=%2Fhost%2Flistings%2Fnew"
              className="font-medium text-forest-700 underline hover:text-forest-600"
            >
              list your van
            </Link>{' '}
            to reach renters searching specifically for campervan rentals.
          </p>
        </div>

        <h3 className="mt-12 font-serif text-xl font-semibold text-charcoal">Common questions</h3>
        <dl className="mt-6 divide-y divide-cream-300/80">
          {HOME_SEO_FAQS.map((faq) => (
            <div key={faq.question} className="py-5 first:pt-0">
              <dt className="font-sans text-base font-semibold text-charcoal">{faq.question}</dt>
              <dd className="mt-2 font-sans text-sm leading-relaxed text-charcoal/65">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
