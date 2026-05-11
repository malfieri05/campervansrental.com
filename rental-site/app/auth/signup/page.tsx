'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseUnavailableReason, isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  /** Set when sign-up succeeded but no session yet (email confirmation required). */
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!termsAccepted) {
      setError('You must certify that you are at least 18 years old and agree to our Terms of Service and Privacy Policy to create an account.')
      return
    }
    if (!isSupabaseConfigured()) {
      setError(
        getSupabaseUnavailableReason() ??
          'Sign-up requires Supabase. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'
      )
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const trimmedEmail = email.trim()
      const { data, error: signErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: {
            display_name: displayName,
            terms_accepted: 'true',
            marketing_email_opt_in: String(marketingEmailOptIn),
          },
        },
      })
      if (signErr) {
        setError(signErr.message)
        return
      }
      // Email confirmation on: Supabase returns a user but no session until they click the link.
      if (data.session) {
        router.push(next)
        router.refresh()
        return
      }
      if (data.user) {
        setPendingConfirmationEmail(trimmedEmail)
        return
      }
      setError('We could not complete sign-up. If you already have an account, try logging in.')
    } finally {
      setLoading(false)
    }
  }

  if (pendingConfirmationEmail) {
    return (
      <div className="min-h-screen bg-cream-100 pt-8 pb-16 px-6">
        <div className="max-w-md mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-5 sm:p-8 shadow-luxury-sm">
          <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">Check your email</h1>
          <p className="font-sans text-sm text-charcoal/80 leading-relaxed mt-4">
            We sent a confirmation link to{' '}
            <span className="font-medium text-charcoal">{pendingConfirmationEmail}</span>. Open that
            email and tap <strong className="text-charcoal">Confirm email</strong> to finish setting up
            your account. You will not be signed in until you confirm.
          </p>
          <p className="font-sans text-sm text-charcoal/70 leading-relaxed mt-4">
            If you do not see the message within a few minutes, check your spam or promotions folder.
          </p>
          <p className="mt-8 text-center font-sans text-sm text-charcoal/50">
            <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="text-forest-700 font-medium hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-16 px-6">
      <div className="max-w-md mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-5 sm:p-8 shadow-luxury-sm">
        <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">Create account</h1>
        <div className="mb-8" />
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}
          <div>
            <label className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2">
              Full name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-cream-100 border border-cream-300 text-charcoal text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-forest-500"
            />
          </div>
          <div>
            <label className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cream-100 border border-cream-300 text-charcoal text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-forest-500"
            />
          </div>
          <div>
            <label className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-cream-100 border border-cream-300 text-charcoal text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-forest-500"
            />
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-4 pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-forest-600 cursor-pointer"
              />
              <span className="font-sans text-sm text-charcoal/80 leading-snug">
                I certify that I am at least 18 years old and agree to the{' '}
                <Link href="/terms" target="_blank" className="text-forest-700 underline hover:text-forest-600">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-forest-700 underline hover:text-forest-600">
                  Privacy Policy
                </Link>
                .{' '}
                <span className="text-red-600 font-medium">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={marketingEmailOptIn}
                onChange={(e) => setMarketingEmailOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-forest-600 cursor-pointer"
              />
              <span className="font-sans text-sm text-charcoal/80 leading-snug">
                I agree to receive email updates from Camper Van Rentals about new listings, trip inspiration, and exclusive offers. You can unsubscribe at any time. See our{' '}
                <Link href="/privacy" target="_blank" className="text-forest-700 underline hover:text-forest-600">
                  Privacy Policy
                </Link>{' '}
                for details.
              </span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="md" disabled={loading} fullWidth>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 text-center font-sans text-sm text-charcoal/50">
          Already have an account?{' '}
          <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="text-forest-700 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 pt-8 px-6 font-sans text-charcoal/50">Loading…</div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
