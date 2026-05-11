'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { StripeEmbeddedCheckout } from '@stripe/stripe-js'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, MapPin, ShieldCheck } from 'lucide-react'
import RatingOrNewBadge from '@/components/ui/RatingOrNewBadge'
import { createClient } from '@/lib/supabase/client'
import {
  reservationFeeCents,
  tripTotalCentsExcludingSecurityDeposit,
  reservationFeeRefundPolicyCopy,
} from '@/lib/booking-pricing'
import { getSupabaseUnavailableReason, isSupabaseConfigured } from '@/lib/env'
import type { Van } from '@/types'
import { vanPickupDisplay } from '@/lib/listing-public-pickup'
import {
  hasPickupProcedureSection,
  hostTripPickupTime,
  hostTripReturnTime,
  pickupProcedureDocUrl,
  pickupProcedureText,
} from '@/lib/listing-trip-guest'
import ReservationFeeLabelWithTooltip from '@/components/booking/ReservationFeeLabelWithTooltip'

interface Props {
  van: Van | null
  listingId: string
  startDate: string
  endDate: string
  guests: number
}

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
}

const DUPLICATE_EMAIL_CHECKOUT_MSG =
  'An account with this email already exists. Try logging in instead.'

/** Normalize Supabase sign-up errors so existing-email cases get a clear, consistent message. */
function mapSignupAuthError(err: { message?: string } | null | undefined): string {
  if (!err?.message) return 'Something went wrong. Please try again.'
  const m = err.message.toLowerCase()
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already registered') ||
    m.includes('email address is already') ||
    m.includes('email already registered')
  ) {
    return DUPLICATE_EMAIL_CHECKOUT_MSG
  }
  return err.message
}

function fmtDate(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return iso
  }
}

function SummaryImageCarousel({
  images,
  alt,
}: {
  images: string[]
  alt: string
}) {
  const [index, setIndex] = useState(0)
  const n = images.length
  const safeIndex = n ? ((index % n) + n) % n : 0
  const src = images[safeIndex] ?? images[0]

  const go = (delta: number) => {
    if (n <= 1) return
    setIndex((i) => (i + delta + n) % n)
  }

  return (
    <div className="relative h-44 bg-cream-200">
      <Image
        src={src}
        alt={`${alt} — photo ${safeIndex + 1} of ${n}`}
        fill
        className="object-cover"
        sizes="360px"
      />
      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-charcoal/45 text-white shadow-md backdrop-blur-sm transition hover:bg-charcoal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-charcoal/45 text-white shadow-md backdrop-blur-sm transition hover:bg-charcoal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-charcoal/50 px-2 py-0.5 font-display text-[0.65rem] font-semibold tabular-nums text-white backdrop-blur-sm"
            aria-hidden
          >
            {safeIndex + 1} / {n}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function CheckoutClient({ van, listingId, startDate, endDate, guests }: Props) {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [signMode, setSignMode] = useState<'login' | 'signup'>('signup')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [checkoutSecrets, setCheckoutSecrets] = useState<{
    clientSecret: string
    publishableKey: string
  } | null>(null)
  const [priceBreakdownOpen, setPriceBreakdownOpen] = useState(false)
  /** True after we merge auth user + profile into `form` (avoids Reserve before hydration). */
  const [accountGuestLoaded, setAccountGuestLoaded] = useState(false)

  const embeddedHostRef = useRef<HTMLDivElement | null>(null)
  const embeddedInstanceRef = useRef<StripeEmbeddedCheckout | null>(null)

  const cancelled = searchParams.get('cancelled')

  const nights =
    startDate && endDate
      ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
      : 0

  const tripTotalCents =
    van && nights > 0
      ? tripTotalCentsExcludingSecurityDeposit({
          pricePerNightCents: Math.round(van.pricePerNight * 100),
          nights,
        })
      : 0
  const reservationFeeC = reservationFeeCents(tripTotalCents)
  const remainingTripAfterReservationCents = Math.max(0, tripTotalCents - reservationFeeC)
  const securityDepositDollars = van?.securityDepositCents
    ? van.securityDepositCents / 100
    : null

  const checkoutPickupTime = van ? hostTripPickupTime(van) : null
  const checkoutReturnTime = van ? hostTripReturnTime(van) : null
  const checkoutProcedureBody = van ? pickupProcedureText(van) : null
  const checkoutProcedureDoc = van ? pickupProcedureDocUrl(van) : null
  const checkoutShowProcedure = van ? hasPickupProcedureSection(van) : false

  const nextPath = useMemo(
    () => `/checkout?${searchParams.toString()}`,
    [searchParams]
  )

  const backHref = useMemo(() => {
    if (van?.id && startDate && endDate) {
      const q = new URLSearchParams({
        start: startDate,
        end: endDate,
        guests: String(guests),
      })
      return `/listings/${encodeURIComponent(van.id)}/request?${q.toString()}`
    }
    if (van?.id) return `/listings/${encodeURIComponent(van.id)}`
    return '/fleet'
  }, [van?.id, startDate, endDate, guests])

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

  /** After we know the user is signed in, load profile + auth email into the guest form. */
  useEffect(() => {
    if (hasSession !== true || !isSupabaseConfigured()) {
      setAccountGuestLoaded(false)
      return
    }
    let cancelled = false
    setAccountGuestLoaded(false)
    ;(async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>
        const { data: row } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name, phone')
          .eq('id', user.id)
          .maybeSingle()
        let first = String(row?.first_name ?? '').trim()
        let last = String(row?.last_name ?? '').trim()
        if (!first && !last) {
          const full = String(
            row?.display_name ?? meta.display_name ?? meta.full_name ?? ''
          ).trim()
          if (full) {
            const space = full.indexOf(' ')
            if (space === -1) first = full
            else {
              first = full.slice(0, space).trim()
              last = full.slice(space + 1).trim()
            }
          }
        }
        const email = String(user.email ?? '').trim()
        const phone = String(row?.phone ?? '').trim()
        if (cancelled) return
        setForm((prev) => ({
          firstName: first || prev.firstName,
          lastName: last || prev.lastName,
          email: email || prev.email,
          phone: phone || prev.phone,
        }))
      } finally {
        if (!cancelled) setAccountGuestLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasSession])

  useLayoutEffect(() => {
    if (!checkoutSecrets) return
    const el = embeddedHostRef.current
    if (!el) return

    let cancelled = false

    ;(async () => {
      try {
        const stripe = await loadStripe(checkoutSecrets.publishableKey)
        if (!stripe || cancelled) return
        embeddedInstanceRef.current?.destroy()
        const checkout = await stripe.createEmbeddedCheckoutPage({
          clientSecret: checkoutSecrets.clientSecret,
        })
        if (cancelled) {
          checkout.destroy()
          return
        }
        embeddedInstanceRef.current = checkout
        checkout.mount(el)
      } catch {
        if (!cancelled) {
          setError('Could not load Stripe Checkout. Refresh and try again.')
          setCheckoutSecrets(null)
        }
      }
    })()

    return () => {
      cancelled = true
      embeddedInstanceRef.current?.destroy()
      embeddedInstanceRef.current = null
    }
  }, [checkoutSecrets])

  // Pre-fill form from sessionStorage draft if coming from old wizard flow
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('checkoutDraft')
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<FormState & {
        guestFirstName?: string
        guestLastName?: string
        guestEmail?: string
        guestPhone?: string
      }>
      setForm({
        firstName: draft.firstName ?? draft.guestFirstName ?? '',
        lastName: draft.lastName ?? draft.guestLastName ?? '',
        email: draft.email ?? draft.guestEmail ?? '',
        phone: draft.phone ?? draft.guestPhone ?? '',
      })
    } catch { /* ignore */ }
  }, [])

  const startCheckout = async () => {
    setError(null)
    setAuthSuccessMessage(null)
    if (!listingId || !startDate || !endDate) {
      setError('Missing trip details. Please go back and select dates.')
      return
    }
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim() || !form.phone?.trim()) {
      const missing: string[] = []
      if (!form.firstName?.trim()) missing.push('first name')
      if (!form.lastName?.trim()) missing.push('last name')
      if (!form.email?.trim()) missing.push('email')
      if (!form.phone?.trim()) missing.push('phone number')
      setError(
        `Your account is missing ${missing.join(', ')}. Open Account in the site header, save your profile, then return here to pay.`
      )
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
          guestFirstName: form.firstName,
          guestLastName: form.lastName,
          guestEmail: form.email,
          guestPhone: form.phone,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setError('Please sign in to complete your booking.')
        setHasSession(false)
        return
      }
      if (!res.ok) {
        setError((body as { error?: string }).error || 'Checkout failed')
        return
      }
      const clientSecret = (body as { clientSecret?: string }).clientSecret
      const publishableKey = (body as { publishableKey?: string }).publishableKey
      if (clientSecret && publishableKey) {
        setCheckoutSecrets({ clientSecret, publishableKey })
        return
      }
      setError('Stripe did not return checkout credentials.')
    } finally {
      setBusy(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAuthSuccessMessage(null)
    if (!isSupabaseConfigured()) {
      setError(
        getSupabaseUnavailableReason() ??
          'Sign-in requires Supabase. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'
      )
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      if (signMode === 'signup') {
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        })
        if (signErr) {
          setError(mapSignupAuthError(signErr))
          return
        }
        // Supabase often returns no error for an existing email (enumeration protection); empty identities means no new user.
        const identities = signData.user?.identities ?? []
        if (!identities.length) {
          setError(DUPLICATE_EMAIL_CHECKOUT_MSG)
          return
        }
        await refreshSession()
        const { data: s } = await supabase.auth.getSession()
        if (!s.session) {
          setAuthSuccessMessage(
            `We sent a confirmation link to ${authEmail.trim()}. Open that email and tap Confirm — you will return to this checkout with your trip saved so you can finish payment.`
          )
          return
        }
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (loginErr) { setError(loginErr.message); return }
        await refreshSession()
      }
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-neutral-200 text-charcoal text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15 transition-all font-sans placeholder:text-charcoal/30'
  const labelClass =
    'block font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/50 mb-1.5'

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 font-sans text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-8">
          Pay and book
        </h1>

        {cancelled && (
          <div className="mb-6 bg-gold-50 border border-gold-200 rounded-xl px-4 py-3 font-sans text-sm text-charcoal/70">
            Payment was cancelled. You can try again when ready.
          </div>
        )}

        {authSuccessMessage && (
          <div className="mb-6 bg-forest-50 border border-forest-200 rounded-xl px-4 py-3 font-sans text-sm text-forest-800">
            {authSuccessMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-sans text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Left: auth + form ───────────────────────── */}
          <div className="space-y-6 order-2 lg:order-1">
            {hasSession === null && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-luxury-sm font-sans text-sm text-charcoal/50">
                Checking your account…
              </div>
            )}

            {/* Auth section */}
            {hasSession === false && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-luxury-sm">
                <h2 className="font-serif text-xl font-semibold text-charcoal mb-1">
                  {signMode === 'signup' ? 'Create an account' : 'Log in'}
                </h2>
                <p className="font-sans text-sm text-charcoal/50 mb-5">
                  {signMode === 'signup'
                    ? 'You need a free account before payment. After you confirm your email (if prompted), you will return here to finish booking — your trip details stay in the link.'
                    : 'Sign in to continue checkout. Your trip dates and listing are kept in this page link.'}
                </p>
                <form onSubmit={(e) => void handleAuth(e)} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      className={inputClass}
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      className={inputClass}
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={signMode === 'signup' ? 'new-password' : 'current-password'}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full bg-gold-400 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-gold transition hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 disabled:opacity-50"
                  >
                    {busy
                      ? 'Working…'
                      : signMode === 'signup'
                      ? 'Create account & continue'
                      : 'Log in & continue'}
                  </button>
                </form>
                <p className="mt-4 text-center font-sans text-xs text-charcoal/40">
                  {signMode === 'signup' ? 'Already have an account? ' : 'No account yet? '}
                  <button
                    type="button"
                    onClick={() => {
                      setSignMode(signMode === 'signup' ? 'login' : 'signup')
                      setAuthSuccessMessage(null)
                      setError(null)
                    }}
                    className="text-forest-700 font-medium hover:underline"
                  >
                    {signMode === 'signup' ? 'Log in' : 'Sign up'}
                  </button>
                </p>
              </div>
            )}

            {/* Payment description */}
            {hasSession !== null && (
              <div className="bg-white border border-neutral-200 rounded-2xl px-6 py-5 shadow-luxury-sm">
                <h2 className="font-serif text-xl font-semibold text-charcoal mb-3">Payment</h2>
                <div className="flex items-start gap-3 mb-4">
                  <ShieldCheck className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                  <div className="font-sans text-sm text-charcoal/60 leading-relaxed space-y-2">
                    <p>
                      Secured by Stripe. Card, Apple Pay and Google Pay accepted where available.
                      Today you pay only the <strong className="text-charcoal/80">reservation fee</strong>{' '}
                      (25% of your trip total).
                    </p>
                    <p className="text-[0.8rem] text-charcoal/50">
                      {reservationFeeRefundPolicyCopy(van?.cancellationPolicy)}
                    </p>
                  </div>
                </div>
                {!checkoutSecrets ? (
                  <button
                    type="button"
                    disabled={busy || hasSession !== true || (hasSession === true && !accountGuestLoaded)}
                    onClick={() => void startCheckout()}
                    className="w-full rounded-full bg-gold-400 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-gold transition hover:bg-gold-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                  >
                    {busy
                      ? 'Preparing payment…'
                      : tripTotalCents > 0
                      ? `Reserve ($${(reservationFeeC / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) →`
                      : 'Reserve →'}
                  </button>
                ) : null}
                <div
                  ref={embeddedHostRef}
                  className={checkoutSecrets ? 'mt-4 w-full min-h-[420px]' : 'hidden'}
                  aria-hidden={!checkoutSecrets}
                />
                {hasSession === false && (
                  <p className="mt-2 text-center font-sans text-[0.72rem] text-charcoal/45">
                    Log in or create an account above to enable payment.
                  </p>
                )}
                <p className="mt-2 text-center font-sans text-[0.7rem] text-charcoal/35">
                  Remaining trip balance and vehicle security deposit are due at pickup unless your host says
                  otherwise.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: trip summary (shows first on mobile) ── */}
          <div className="lg:sticky lg:top-24 order-1 lg:order-2">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-luxury-sm overflow-visible">
              {/* Image clips to top corners; card stays overflow-visible so tooltips aren’t clipped */}
              {van && (
                <div className="overflow-hidden rounded-t-2xl">
                  <SummaryImageCarousel
                    key={van.listingUuid ?? van.id}
                    images={
                      van.images?.length
                        ? van.images
                        : ['https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800']
                    }
                    alt={van.name}
                  />
                </div>
              )}
              <div className="px-5 py-4 border-b border-neutral-100">
                {van ? (
                  <>
                    <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-gold-600 mb-0.5">
                      {van.category}
                    </p>
                    <p className="font-serif text-lg font-semibold text-charcoal leading-tight">
                      {van.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <RatingOrNewBadge reviewCount={van.reviewCount} rating={van.rating} size="sm" />
                    </div>
                    <p className="font-sans text-xs text-charcoal/45 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {vanPickupDisplay(van)}
                    </p>
                  </>
                ) : (
                  <p className="font-sans text-sm text-charcoal/50">Your reservation</p>
                )}
              </div>

              {/* Trip dates + nights */}
              {startDate && endDate && (
                <div className="px-5 py-4 border-b border-neutral-100">
                  <div className="flex justify-between items-start gap-3 font-sans text-sm text-charcoal/70 mb-2">
                    <span className="font-medium text-charcoal shrink-0">Check-in</span>
                    <div className="text-right min-w-0">
                      <span>{fmtDate(startDate)}</span>
                      {checkoutPickupTime ? (
                        <p className="text-xs text-charcoal/45 mt-0.5 leading-snug">
                          Pickup from {checkoutPickupTime}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-3 font-sans text-sm text-charcoal/70 mb-2">
                    <span className="font-medium text-charcoal shrink-0">Check-out</span>
                    <div className="text-right min-w-0">
                      <span>{fmtDate(endDate)}</span>
                      {checkoutReturnTime ? (
                        <p className="text-xs text-charcoal/45 mt-0.5 leading-snug">
                          Return by {checkoutReturnTime}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {van && startDate && endDate ? (
                <div className="px-5 py-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-charcoal/40" />
                    <span className="font-sans text-sm font-medium text-charcoal">Pickup location</span>
                  </div>
                  <p className="font-sans text-sm text-charcoal/60">{vanPickupDisplay(van)}</p>
                  <p className="font-sans text-xs text-charcoal/35 mt-1">
                    Exact address provided after booking confirmation.
                  </p>
                  {checkoutShowProcedure ? (
                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                        Pickup procedure
                      </p>
                      {checkoutProcedureBody ? (
                        <p className="font-sans text-sm text-charcoal/70 leading-relaxed whitespace-pre-wrap">
                          {checkoutProcedureBody}
                        </p>
                      ) : null}
                      {checkoutProcedureDoc ? (
                        <a
                          href={checkoutProcedureDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-sans text-sm font-medium text-forest-700 hover:text-forest-600 underline ${checkoutProcedureBody ? 'mt-3 inline-block' : 'inline-block'}`}
                        >
                          View pickup & drop-off document
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Fee breakdown */}
              <div className="px-5 py-4 space-y-3">
                {van && nights > 0 ? (
                  <>
                    <div className="flex justify-between font-sans text-sm text-charcoal/70">
                      <span>${van.pricePerNight.toLocaleString()}</span>
                      <span>
                        × {nights} night{nights !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between font-sans text-sm text-charcoal/70">
                      <span>Fees</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-sans text-sm font-semibold text-charcoal border-t border-neutral-100 pt-2">
                      <span>Trip total</span>
                      <span>
                        $
                        {(tripTotalCents / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPriceBreakdownOpen((o) => !o)}
                      className="mt-2 flex w-full items-center gap-1.5 pl-3 text-left font-sans text-sm text-charcoal/55 hover:text-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/30 rounded-md py-0.5 -ml-0.5"
                      aria-expanded={priceBreakdownOpen}
                      aria-controls="checkout-price-breakdown"
                      id="checkout-price-breakdown-toggle"
                    >
                      <span
                        className={`inline-flex w-3 shrink-0 justify-center font-sans text-xs text-charcoal/40 transition-transform duration-200 ${priceBreakdownOpen ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        {'>'}
                      </span>
                      <span className="font-medium">Breakdown</span>
                    </button>

                    <div
                      id="checkout-price-breakdown"
                      role="region"
                      aria-labelledby="checkout-price-breakdown-toggle"
                      hidden={!priceBreakdownOpen}
                      className="border-t border-neutral-100 pt-3 space-y-2"
                    >
                      <p className="pl-2 font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">
                        Due today:
                      </p>
                      <div className="flex justify-between items-start gap-3 pl-5 font-sans text-sm text-forest-800">
                        <ReservationFeeLabelWithTooltip cancellationPolicy={van.cancellationPolicy} />
                        <span className="shrink-0 tabular-nums">
                          $
                          {(reservationFeeC / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="pl-2 font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">
                          Due at pickup:
                        </p>
                        <div className="flex justify-between pl-5 font-sans text-sm text-forest-800">
                          <span>Remaining trip balance</span>
                          <span className="shrink-0 tabular-nums">
                            $
                            {(remainingTripAfterReservationCents / 100).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {securityDepositDollars !== null && (
                          <div className="flex justify-between pl-5 font-sans text-sm text-charcoal italic">
                            <span>Security deposit</span>
                            <span className="shrink-0 tabular-nums">
                              $
                              {securityDepositDollars.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="font-sans text-[0.7rem] text-charcoal/35 pt-1">
                        Remaining balance and security deposit are collected at pickup.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="font-sans text-sm text-charcoal/40">Trip details not available.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
