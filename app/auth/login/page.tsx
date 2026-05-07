'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseUnavailableReason, isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        <p className="font-sans text-sm text-charcoal/50 mb-8">
          Access your account to continue checkout or manage listings.
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}
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
          <Button type="submit" variant="primary" size="md" disabled={loading} fullWidth>
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
