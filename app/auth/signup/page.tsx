'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured()) {
      setError(
        'Sign-up needs a live Supabase project. Turn off NEXT_PUBLIC_SUPABASE_OFFLINE and set valid Supabase URL and anon key in .env.'
      )
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { display_name: displayName },
        },
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
      <div className="max-w-md mx-auto bg-cream-50 border border-cream-300/60 rounded-sm p-8 shadow-luxury-sm">
        <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">Create account</h1>
        <p className="font-sans text-sm text-charcoal/50 mb-8">
          Renters: optional until checkout. Hosts: required to list a van.
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}
          <div>
            <label className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2">
              Display name
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
