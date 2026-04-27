'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'

export default function UserAuthNav({ mobile = false }: { mobile?: boolean }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setEmail(null)
      return
    }
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setEmail(null)
    window.location.href = '/'
  }

  if (email === undefined) {
    return <div className={mobile ? 'h-10' : 'h-8 w-32'} aria-hidden />
  }

  if (!email) {
    return (
      <div
        className={
          mobile
            ? 'flex flex-col gap-3 pt-2'
            : 'hidden lg:flex items-center gap-4'
        }
      >
        <Link
          href="/auth/signup"
          className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-cream-200/90 hover:text-gold-300 transition-colors"
        >
          Create account
        </Link>
        <Link
          href="/auth/login"
          className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-cream-200/90 hover:text-gold-300 transition-colors"
        >
          Log in
        </Link>
        <Button href="/auth/login?next=/host/listings/new" variant="secondary" size="sm">
          List your van
        </Button>
      </div>
    )
  }

  return (
    <div
      className={
        mobile
          ? 'flex flex-col gap-3 pt-2 border-t border-forest-800/40 mt-4'
          : 'hidden lg:flex items-center gap-4'
      }
    >
      <span className="font-sans text-xs text-cream-200/70 truncate max-w-[180px]">{email}</span>
      <Button href="/host" variant="secondary" size="sm">
        Host
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        Log out
      </Button>
    </div>
  )
}
