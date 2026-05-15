'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import Button from '@/components/ui/Button'
import { ProfileInitialsContent } from '@/components/ui/ProfileInitialsContent'

type AuthState =
  | { status: 'loading' }
  | { status: 'logged_out' }
  | {
      status: 'logged_in'
      email: string
      firstName: string
      initials: string
      isHost: boolean
      avatarUrl: string | null
    }

function buildIdentity(
  displayName: string | null | undefined,
  email: string,
  isHost: boolean,
  avatarUrl: string | null | undefined
): AuthState {
  const rawName = displayName?.trim()
  const nameParts = rawName ? rawName.split(/\s+/).filter(Boolean) : []
  const firstName = nameParts[0] || email.split('@')[0]
  const initialsFromName =
    nameParts.length > 0
      ? nameParts
          .slice(0, 2)
          .map((p) => p.charAt(0).toUpperCase())
          .join('')
      : ''
  const initials = (initialsFromName || email.charAt(0).toUpperCase() || 'U').slice(0, 2)

  return {
    status: 'logged_in',
    email,
    firstName,
    initials,
    isHost,
    avatarUrl: avatarUrl?.trim() || null,
  }
}

export default function UserAuthNav({ mobile = false, onMobileNavigate }: { mobile?: boolean; onMobileNavigate?: () => void }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthState({ status: 'logged_out' })
      return
    }
    const supabase = createClient()

    const loadProfile = async (user: { id: string; email?: string | null } | null) => {
      if (!user?.email) {
        setAuthState({ status: 'logged_out' })
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('display_name, is_host, avatar_url')
        .eq('id', user.id)
        .single()

      setAuthState(buildIdentity(data?.display_name, user.email, Boolean(data?.is_host), data?.avatar_url))
    }

    void supabase.auth.getSession().then(({ data }) => {
      void loadProfile(data.session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!open) return

    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const signOut = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setAuthState({ status: 'logged_out' })
    window.location.href = '/'
  }

  if (authState.status === 'loading') {
    return <div className={mobile ? 'h-10' : 'h-8 w-32'} aria-hidden />
  }

  if (authState.status === 'logged_out') {
    return (
      <div
        className={
          mobile
            ? 'flex flex-col gap-3 pt-2'
            : 'hidden lg:flex items-center gap-4'
        }
      >
        <Link
          href="/auth/login"
          onClick={mobile ? onMobileNavigate : undefined}
          className={[
            'font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors',
            pathname === '/auth/login'
              ? 'text-gold-300'
              : 'text-cream-200/90 hover:text-gold-300',
          ].join(' ')}
        >
          Log in
        </Link>
        {!mobile && <span className="text-cream-200/50 text-xs" aria-hidden>|</span>}
        <Link
          href="/auth/signup"
          onClick={mobile ? onMobileNavigate : undefined}
          className={[
            'font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors',
            pathname === '/auth/signup'
              ? 'text-gold-300'
              : 'text-cream-200/90 hover:text-gold-300',
          ].join(' ')}
        >
          Sign up
        </Link>
        <Button
          href={`/auth/signup?next=${encodeURIComponent('/host/listings/new')}`}
          variant="secondary"
          size="sm"
        >
          Try hosting today
        </Button>
      </div>
    )
  }

  const roleLabel = authState.isHost ? 'Host' : 'Traveler'

  if (mobile) {
    return (
      <div className="flex flex-col gap-3 pt-2 border-t border-forest-800/40 mt-4">
        <div className="rounded-xl border border-forest-700/60 bg-forest-900/50 px-3 py-3">
          <p className="font-sans text-sm text-cream-100">Hi, {authState.firstName}</p>
          <p className="mt-0.5 font-display text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold-300">
            {roleLabel}
          </p>
        </div>
        <Link
          href="/account"
          onClick={onMobileNavigate}
          className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-cream-200/90 hover:text-gold-300 transition-colors"
        >
          Account
        </Link>
        <Button variant="ghost" size="sm" onClick={() => { onMobileNavigate?.(); void signOut() }}>
          Log out
        </Button>
      </div>
    )
  }

  return (
    <div className="relative hidden lg:flex items-center" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group grid h-10 w-10 shrink-0 grid-cols-1 grid-rows-1 overflow-hidden rounded-full border border-cream-300/50 bg-forest-900 p-0 transition hover:border-gold-300/70"
      >
        {authState.avatarUrl ? (
          <Image
            src={authState.avatarUrl}
            alt={`${authState.firstName} profile`}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <ProfileInitialsContent
            initials={authState.initials}
            textClassName="font-display text-cream-100 group-hover:text-gold-200"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-[70] w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="border-b border-neutral-200 px-4 py-3">
            <p className="font-sans text-sm font-medium text-neutral-900">Hi, {authState.firstName}</p>
            <p className="mt-0.5 font-display text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {roleLabel}
            </p>
          </div>
          <div className="px-2 py-2">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full rounded-md px-3 py-2 font-sans text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              Account
            </Link>
            <div className="my-1 h-px bg-neutral-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="w-full rounded-md px-3 py-2 text-left font-sans text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
