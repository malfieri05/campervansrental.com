import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Camper Van Rentals',
  description:
    'Read the Camper Van Rentals Terms of Service governing your use of our peer-to-peer camper van rental marketplace.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream-100 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-2">
          Terms of Service
        </h1>
        <p className="font-sans text-sm text-charcoal/50 mb-12">Last updated: May 10, 2026</p>

        <div className="space-y-10 font-sans text-charcoal/80 text-[0.95rem] leading-relaxed">

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">1. Acceptance of Terms</h2>
            <p>
              Welcome to Camper Van Rentals, operated by Camper Van Rentals LLC (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account, accessing, or using our website at{' '}
              <a href="https://campervansrental.com" className="text-forest-700 underline hover:text-forest-600">campervansrental.com</a>{' '}
              (the &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Platform.
            </p>
            <p className="mt-3">
              We may update these Terms from time to time. When we make material changes, we will notify you by email or by posting a prominent notice on the Platform. Your continued use of the Platform after any update constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">2. Eligibility</h2>
            <p>
              You must be at least 18 years of age to use this Platform. By creating an account, you represent and warrant that you are 18 or older, that you have the legal capacity to enter into these Terms, and that your use of the Platform will not violate any applicable law or regulation.
            </p>
            <p className="mt-3">
              To rent a camper van as a Guest, most vehicle owners require renters to hold a valid driver&rsquo;s license and meet minimum age and driving history requirements set by the individual Host. These requirements are displayed on each listing and may vary.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">3. Description of the Platform</h2>
            <p>
              Camper Van Rentals is a peer-to-peer marketplace that connects independent vehicle owners (&ldquo;Hosts&rdquo;) with travelers seeking to rent camper vans (&ldquo;Guests&rdquo;). We do not own the vehicles listed on the Platform. We provide the technology, tools, and support to facilitate bookings between Hosts and Guests.
            </p>
            <p className="mt-3">
              We are not a party to the rental agreement between a Host and a Guest, nor are we a rental agency, insurer, or transportation carrier. Any rental transaction is a direct agreement between the Host and the Guest, subject to the terms they each accept.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">4. Accounts</h2>
            <p>
              You must create an account to list a vehicle or make a booking. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
            </p>
            <p className="mt-3">
              You may not create an account on behalf of another person without their authorization, use another person&rsquo;s account, or transfer your account to another person. We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">5. Listings and Bookings</h2>
            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">5a. Hosts</h3>
            <p>
              By listing a vehicle, you represent that you own the vehicle or have the legal right and authority to rent it, that the vehicle is safe, roadworthy, legally registered and insured for peer-to-peer rental use, and that the listing accurately describes the vehicle, its condition, and all applicable fees and rules. You are solely responsible for setting your pricing, availability, and house rules.
            </p>
            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">5b. Guests</h3>
            <p>
              By submitting a booking request, you agree to the Host&rsquo;s listed rules, fees, and pickup/dropoff requirements. You are responsible for the vehicle during your rental period, including any damage beyond normal wear and tear, traffic violations, and tolls incurred during your trip.
            </p>
            <h3 className="font-semibold text-charcoal text-base mt-4 mb-2">5c. Cancellations and Refunds</h3>
            <p>
              Cancellation terms are set by each Host and are clearly disclosed on the listing before you confirm a booking. Refund eligibility depends on when you cancel relative to the trip start date. We may charge a platform service fee regardless of cancellation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">6. Payments</h2>
            <p>
              All payments are processed through our third-party payment processor (currently Stripe). By submitting payment information, you authorize us to charge your payment method for the total booking amount, including the nightly rate, any fees set by the Host, and our platform service fee. Funds for completed stays are released to Hosts according to our payout schedule.
            </p>
            <p className="mt-3">
              We are not responsible for errors or service interruptions caused by our payment processor. Your use of payment services is also governed by Stripe&rsquo;s terms of service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">7. Reviews</h2>
            <p>
              After a completed trip, Hosts and Guests may leave reviews for each other. Reviews must be honest, accurate, and based on your direct experience. You may not post reviews that are defamatory, misleading, or submitted in exchange for compensation. We reserve the right to remove reviews that violate these guidelines, but we do not verify the accuracy of reviews and are not liable for their content.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">8. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li>Use the Platform for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Circumvent the Platform to make off-platform arrangements with Hosts or Guests you discovered through the Platform.</li>
              <li>Post false, misleading, or fraudulent listings or information.</li>
              <li>Harass, threaten, or harm other users.</li>
              <li>Introduce malicious code, bots, or automated scripts that interfere with the Platform.</li>
              <li>Collect or harvest any personal data of other users without their consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">9. Insurance and Liability Between Users</h2>
            <p>
              Hosts are responsible for ensuring they have adequate insurance coverage for peer-to-peer vehicle rentals. We strongly recommend Hosts verify that their personal auto policy or a supplemental policy covers commercial rental activity. Guests are responsible for understanding what coverage, if any, is provided through the Host, through their own personal auto policy, or through credit card benefits.
            </p>
            <p className="mt-3">
              We do not provide insurance. Any disputes about damage, liability, or personal injury arising from a rental are between the Host and Guest.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">10. Disclaimers</h2>
            <p>
              THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
            <p className="mt-3">
              We make no representations or warranties regarding any vehicle listed on the Platform, including its condition, roadworthiness, fitness for a particular journey, or compliance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">11. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, CAMPER VAN RENTALS LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR PERSONAL INJURY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3">
              OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIM ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED DOLLARS (USD $100).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">12. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Camper Van Rentals LLC and its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&rsquo; fees) arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your listing, rental, or use of a vehicle; or (d) your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">13. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for any reason, including violation of these Terms. You may close your account at any time by contacting us at{' '}
              <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">support@campervansrental.com</a>. Upon termination, your right to use the Platform ceases immediately. Any outstanding bookings or payment obligations survive termination.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">14. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the United States. Any dispute arising from or relating to these Terms or your use of the Platform shall first be addressed informally by contacting us at{' '}
              <a href="mailto:support@campervansrental.com" className="text-forest-700 underline hover:text-forest-600">support@campervansrental.com</a>. If we cannot resolve the dispute informally, it shall be submitted to binding arbitration under the rules of the American Arbitration Association, conducted in English. You and we each waive any right to a jury trial or to participate in a class action.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">15. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
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
            <Link href="/privacy" className="text-forest-700 underline hover:text-forest-600">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
