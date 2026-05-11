'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseUnavailableReason, isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const signInWithGoogle = async () => {
    setError(null)
    if (!isSupabaseConfigured()) {
      setError(
        getSupabaseUnavailableReason() ??
          'Sign-in requires Supabase. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'
      )
      return
    }
    setOauthLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (oauthErr) {
        setError(oauthErr.message)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('Could not start Google sign-in. Try again or use email and password.')
    } finally {
      setOauthLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured()) {
      setError(
        getSupabaseUnavailableReason() ??
          'Sign-in requires Supabase. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'
      )
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signErr) {
        setError(signErr.message)
        return
      }
      router.push(next)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-16 px-6">
      <div className="max-w-md mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-5 sm:p-8 shadow-luxury-sm">
        <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">Log in</h1>
        <p className="font-sans text-sm text-charcoal/50 mb-6">
          Access your account to continue checkout or manage listings.
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading || oauthLoading}
          className="mb-6 flex w-full items-center justify-center gap-2.5 rounded-sm border border-charcoal/15 bg-white px-4 py-3.5 font-sans text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-cream-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-cream-50 px-3 font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-charcoal/40">
              or with email
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-cream-100 border border-cream-300 text-charcoal text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-forest-500"
            />
          </div>
          <Button type="submit" variant="primary" size="md" disabled={loading || oauthLoading} fullWidth>
            {loading ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-center font-sans text-sm text-charcoal/50">
          No account?{' '}
          <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="text-forest-700 font-medium hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 pt-8 px-6 font-sans text-charcoal/50">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
