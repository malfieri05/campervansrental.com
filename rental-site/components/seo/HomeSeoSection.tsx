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
          A camper van marketplace for travelers and owners
        </h2>
        <div className="mt-6 space-y-4 font-sans text-base leading-relaxed text-charcoal/70">
          <p>
            <strong className="font-medium text-charcoal">Camper Van Rentals</strong> is a
            peer-to-peer marketplace built for van life — camper vans and conversions only, not
            motorhomes or towables buried in a general RV catalog.
          </p>
          <p>
            Our biggest difference is <strong className="font-medium text-charcoal">much lower
            transaction fees</strong> than most large rental marketplaces.{' '}
            <strong className="font-medium text-charcoal">For renters,</strong> that means the same
            secure checkout, availability calendars, and rental agreements you expect from a
            full-service platform — often at a lower total trip price.{' '}
            <strong className="font-medium text-charcoal">For owners,</strong> it means keeping more
            of every booking while still getting calendar sync, hosted payouts, and tools built for
            campervan hosts.
          </p>
          <p>
            <Link href="/fleet" className="font-medium text-forest-700 underline hover:text-forest-600">
              Browse vans to rent
            </Link>{' '}
            by location and dates, or{' '}
            <Link
              href="/auth/signup?next=%2Fhost%2Flistings%2Fnew"
              className="font-medium text-forest-700 underline hover:text-forest-600"
            >
              list your camper van
            </Link>{' '}
            and start earning on trips when your rig is available.
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
