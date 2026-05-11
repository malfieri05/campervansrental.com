import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Camper Van Rentals',
  description:
    'Learn how Camper Van Rentals collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream-100 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-2">
          Privacy Policy
        </h1>
        <p className="font-sans text-sm text-charcoal/50 mb-12">Last updated: May 10, 2026</p>

        <div className="space-y-10 font-sans text-charcoal/80 text-[0.95rem] leading-relaxed">

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">1. Introduction</h2>
            <p>
              Camper Van Rentals LLC (&ldquo;Camper Van Rentals,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the peer-to-peer camper van rental marketplace at{' '}
              <a href="https://campervansrental.com" className="text-forest-700 underline hover:text-forest-600">campervansrental.com</a>{' '}
              (the &ldquo;Platform&rdquo;). This Privacy Policy explains how we collect, use, share, and protect information about you when you use our Platform, and describes your choices regarding that information.
            </p>
            <p className="mt-3">
              By using the Platform, you agree to the practices described in this Privacy Policy. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">2. Information We Collect</h2>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">2a. Information You Provide</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-medium text-charcoal">Account information:</span> Full name, email address, and password when you register.</li>
              <li><span className="font-medium text-charcoal">Profile information:</span> Any additional profile details you choose to provide, such as a profile photo or bio.</li>
              <li><span className="font-medium text-charcoal">Listing information:</span> If you list a vehicle, we collect vehicle details, photos, location, availability, pricing, and any rules or descriptions you provide.</li>
              <li><span className="font-medium text-charcoal">Booking information:</span> Trip dates, pickup and dropoff locations, and any communications you send through the Platform.</li>
              <li><span className="font-medium text-charcoal">Payment information:</span> Payment details are collected and processed directly by our payment processor (Stripe). We do not store full payment card numbers.</li>
              <li><span className="font-medium text-charcoal">Communications:</span> Messages you send to us or to other users through the Platform, and review content you submit.</li>
              <li><span className="font-medium text-charcoal">Consent records:</span> Whether you have agreed to our Terms of Service and opted in to marketing emails, as captured at account creation.</li>
            </ul>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">2b. Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-medium text-charcoal">Usage data:</span> Pages you visit, features you use, links you click, and the dates and times of your visits.</li>
              <li><span className="font-medium text-charcoal">Device and browser data:</span> IP address, browser type, operating system, device identifiers, and referring URLs.</li>
              <li><span className="font-medium text-charcoal">Cookies and similar technologies:</span> We use cookies and local storage to keep you logged in, remember preferences, and analyze how the Platform is used. See Section 8 for more on cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li>Create and manage your account and provide access to the Platform.</li>
              <li>Facilitate bookings, payments, and communications between Hosts and Guests.</li>
              <li>Process payments and payouts through our third-party payment processor.</li>
              <li>Verify identity and eligibility where applicable.</li>
              <li>Send transactional emails: booking confirmations, trip reminders, payment receipts, and support replies.</li>
              <li>Send marketing emails about new listings, travel inspiration, and platform updates, if you have opted in. You may opt out at any time.</li>
              <li>Improve, personalize, and develop new features for the Platform.</li>
              <li>Detect and prevent fraud, abuse, and security incidents.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share it in the following circumstances:</p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">4a. Between Hosts and Guests</h3>
            <p>
              When a booking is confirmed, we share relevant booking details and contact information between the Host and Guest as necessary to complete the rental.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">4b. Service Providers</h3>
            <p>
              We share information with trusted third-party vendors who help us operate the Platform, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li><span className="font-medium text-charcoal">Supabase</span> — database and authentication infrastructure.</li>
              <li><span className="font-medium text-charcoal">Stripe</span> — payment processing.</li>
              <li><span className="font-medium text-charcoal">Vercel</span> — hosting and content delivery.</li>
              <li>Email delivery and other operational providers as needed.</li>
            </ul>
            <p className="mt-3">
              These providers are contractually required to process your data only as directed by us and in accordance with applicable law.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">4c. Legal Requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or government authority, or when we believe disclosure is necessary to protect the rights, property, or safety of Camper Van Rentals, our users, or the public.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">4d. Business Transfers</h3>
            <p>
              If Camper Van Rentals LLC is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email or prominent notice on the Platform before your data is transferred and subject to a different privacy policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Platform, resolve disputes, enforce our agreements, and comply with legal obligations. If you close your account, we will delete or anonymize your personal information within a reasonable period, except where retention is required by law or for legitimate business purposes such as fraud prevention and record-keeping.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">6. Security</h2>
            <p>
              We use industry-standard measures to protect your information, including encrypted data transmission (HTTPS), access controls, and regular security reviews of our infrastructure. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use a strong, unique password for your account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">7. Your Rights and Choices</h2>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">7a. Access and Correction</h3>
            <p>
              You may access or update your account information at any time through your account settings or by contacting us.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">7b. Deletion</h3>
            <p>
              You may request deletion of your account and associated personal data by emailing{' '}
              <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">support@campervansrental.com</a>. We will process your request in accordance with applicable law. Some information may be retained for legal, fraud-prevention, or dispute-resolution purposes.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">7c. Marketing Emails</h3>
            <p>
              If you have opted in to marketing emails, you can unsubscribe at any time by clicking the &ldquo;unsubscribe&rdquo; link in any marketing email we send, or by contacting us at{' '}
              <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">support@campervansrental.com</a>. Opting out of marketing emails does not affect transactional or account-related communications.
            </p>

            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">7d. California Residents</h3>
            <p>
              If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), including the right to know what personal information we collect, the right to delete your information, and the right to opt out of certain sharing. To exercise these rights, contact us at{' '}
              <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">support@campervansrental.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">8. Cookies</h2>
            <p>
              We use essential cookies to keep you authenticated and remember your session. We may use analytics cookies to understand how the Platform is used in aggregate. You can control cookies through your browser settings, though disabling essential cookies may prevent you from logging in or using certain features.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">9. Children&rsquo;s Privacy</h2>
            <p>
              The Platform is not directed to children under the age of 18. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected information from a person under 18, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">10. International Transfers</h2>
            <p>
              Our Platform is operated from the United States. If you access the Platform from outside the United States, your information will be transferred to and processed in the United States, where data protection laws may differ from those in your country. By using the Platform, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by posting a prominent notice on the Platform and updating the &ldquo;Last updated&rdquo; date above. Your continued use of the Platform after the effective date of any update constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">12. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests related to this Privacy Policy, please contact us at:
            </p>
            <address className="mt-3 not-italic space-y-1">
              <p className="font-medium text-charcoal">Camper Van Rentals LLC</p>
              <p>
                Email:{' '}
                <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">
                  support@campervansrental.com
                </a>
              </p>
              <p>Website:{' '}
                <a href="https://campervansrental.com" className="text-forest-700 underline hover:text-forest-600">
                  campervansrental.com
                </a>
              </p>
            </address>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-cream-300">
          <p className="font-sans text-xs text-charcoal/40">
            See also our{' '}
            <Link href="/terms" className="text-forest-700 underline hover:text-forest-600">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
