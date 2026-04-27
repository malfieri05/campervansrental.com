'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

type Draft = {
  pickupLocation: string
  guestFirstName: string
  guestLastName: string
  guestEmail: string
  guestPhone: string
  specialRequests?: string
}

export default function CheckoutClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const listingId = searchParams.get('listing') || ''
  const startDate = searchParams.get('start') || ''
  const endDate = searchParams.get('end') || ''
  const guests = Number(searchParams.get('guests') || '2')

  const nextPath = useMemo(
    () => `/checkout?${searchParams.toString()}`,
    [searchParams]
  )

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHasSession(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    setHasSession(Boolean(data.session))
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const readDraft = (): Draft | null => {
    try {
      const raw = sessionStorage.getItem('checkoutDraft')
      if (!raw) return null
      return JSON.parse(raw) as Draft
    } catch {
      return null
    }
  }

  const startCheckout = async () => {
    setError(null)
    const draft = readDraft()
    if (!listingId || !startDate || !endDate || !draft) {
      setError('Missing trip details. Return to booking and choose dates again.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate,
          endDate,
          guests,
          pickupLocation: draft.pickupLocation,
          guestFirstName: draft.guestFirstName,
          guestLastName: draft.guestLastName,
          guestEmail: draft.guestEmail,
          guestPhone: draft.guestPhone,
          specialRequests: draft.specialRequests,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setError('Please sign in or create an account to pay the deposit.')
        setHasSession(false)
        return
      }
      if (!res.ok) {
        setError(body.error || 'Checkout failed')
        return
      }
      if (body.url) {
        window.location.href = body.url as string
        return
      }
      setError(body.error || 'Stripe did not return a checkout URL.')
    } finally {
      setBusy(false)
    }
  }

  const quickSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured()) {
      setError(
        'Account creation requires Supabase. Disable NEXT_PUBLIC_SUPABASE_OFFLINE and configure valid Supabase keys, or sign in once those are set.'
      )
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })
      if (signErr) {
        setError(signErr.message)
        return
      }
      await refreshSession()
      if (!(await supabase.auth.getSession()).data.session) {
        setError('Check your email to confirm your account, then return to checkout.')
        return
      }
      await startCheckout()
    } finally {
      setBusy(false)
    }
  }

  const cancelled = searchParams.get('cancelled')

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-16 px-6">
      <div className="max-w-lg mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-8 shadow-luxury-sm space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Deposit checkout</h1>
        {cancelled && (
          <p className="text-sm text-charcoal/60">Payment was cancelled. You can try again when ready.</p>
        )}
        <p className="font-sans text-sm text-charcoal/55">
          We use Stripe for the reservation deposit. Create a quick account (or log in), then pay
          securely.
        </p>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
            {error}
          </p>
        )}
        {hasSession === false && (
          <div className="space-y-4">
            <form onSubmit={quickSignup} className="space-y-3">
              <div>
                <label className="block font-display text-[0.65rem] font-bold uppercase tracking-widest text-forest-800 mb-1">
                  Email
                </label>
                <input
                  className="w-full bg-cream-100 border border-cream-300 rounded-sm px-3 py-2 text-sm"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-display text-[0.65rem] font-bold uppercase tracking-widest text-forest-800 mb-1">
                  Password
                </label>
                <input
                  className="w-full bg-cream-100 border border-cream-300 rounded-sm px-3 py-2 text-sm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" variant="primary" size="md" fullWidth disabled={busy}>
                {busy ? 'Working…' : 'Create account & continue'}
              </Button>
            </form>
            <p className="text-center font-sans text-xs text-charcoal/45">
              Already registered?{' '}
              <Link
                href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
                className="text-forest-700 font-medium hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        )}
        {hasSession === true && (
          <div className="space-y-3">
            <p className="font-sans text-sm text-charcoal/50">
              You are signed in. Continue to Stripe to pay the deposit.
            </p>
            <Button variant="primary" size="md" fullWidth disabled={busy} onClick={() => void startCheckout()}>
              {busy ? 'Redirecting…' : 'Pay deposit with Stripe'}
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => router.push('/booking')} className="!text-charcoal">
          Back to booking
        </Button>
      </div>
    </div>
  )
}
