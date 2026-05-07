'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGroup, motion } from 'framer-motion'
import { Menu, X, Tent } from 'lucide-react'
import UserAuthNav from '@/components/layout/UserAuthNav'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'

const travelerLinks = [
  { label: 'Home', href: '/' },
  { label: 'Browse', href: '/fleet' },
  { label: 'My Trips', href: '/trips' },
]

const hostLinks = [
  { label: 'Home', href: '/host' },
  { label: 'Listings', href: '/host/listings' },
  { label: 'Calendar', href: '/host/calendar' },
  { label: 'Bookings', href: '/host/bookings' },
]

function useIsHost() {
  const [isHost, setIsHost] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    async function fetchIsHost(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('is_host')
        .eq('id', userId)
        .single()
      setIsHost(data?.is_host ?? false)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        fetchIsHost(data.session.user.id)
      } else {
        setIsHost(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchIsHost(session.user.id)
      } else {
        setIsHost(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return isHost
}

function useLoggedIn() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoggedIn(false)
      return
    }
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session))
    })
    return () => subscription.unsubscribe()
  }, [])

  return loggedIn
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isHost = useIsHost()
  const loggedIn = useLoggedIn()

  /** Logged-in travelers see Browse next to the profile; logged-out users do not. */
  const showBrowse = loggedIn === true && isHost === false

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navbarClasses = [
    'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out',
    'border-b border-forest-900/40 bg-forest-950/95 backdrop-blur-md shadow-sm',
    scrolled ? 'shadow-luxury border-forest-800/50' : '',
  ]
    .filter(Boolean)
    .join(' ')

  /** `/` and `/host` only highlight on exact match — prefix match would light up every route. */
  const isActiveLink = (href: string) => {
    if (pathname === href) return true
    if (href === '/' || href === '/host') return false
    return pathname.startsWith(`${href}/`)
  }

  const desktopLinkClass = (active: boolean) =>
    [
      'font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-300 relative inline-block pb-1',
      active ? 'text-gold-300' : 'text-cream-200/80 hover:text-gold-300',
    ].join(' ')

  const mobileLinkClass = (active: boolean) =>
    [
      'font-display text-sm font-semibold uppercase tracking-[0.15em] transition-colors duration-200 border-b border-forest-800/40 pb-4',
      active ? 'text-gold-300' : 'text-cream-100/80 hover:text-gold-300',
    ].join(' ')

  const mobileNavLinks = isHost ? hostLinks : showBrowse ? travelerLinks : []

  return (
    <>
      <nav className={navbarClasses}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {/* 1fr | auto | 1fr — nav track is truly centered in the bar (not offset by uneven logo vs. profile width) */}
          <div className="flex h-20 items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 lg:justify-self-start">
              <div className="w-9 h-9 bg-gold-400 flex items-center justify-center rounded-sm group-hover:bg-gold-300 transition-colors duration-300">
                <Tent className="w-5 h-5 text-forest-950" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-cream-50 font-semibold text-base leading-tight tracking-wide group-hover:text-gold-300 transition-colors duration-300">
                  Camper Van
                </span>
                <span className="font-display text-gold-400 text-[0.6rem] font-bold uppercase tracking-[0.2em] leading-tight">
                  Rentals
                </span>
              </div>
            </Link>

            {/* Desktop Navigation — host and traveler tabs centered (same layout as host) */}
            <LayoutGroup id="desktop-nav-tabs">
              <div className="hidden lg:flex items-center justify-center gap-10 lg:justify-self-center min-w-0">
                {(isHost ? hostLinks : showBrowse ? travelerLinks : []).map((link) => {
                  const active = isActiveLink(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={desktopLinkClass(active)}
                    >
                      {link.label}
                      {active && (
                        <motion.span
                          layoutId="desktop-nav-underline"
                          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gold-400"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            </LayoutGroup>

            <div className="flex items-center justify-end shrink-0 lg:justify-self-end gap-2">
              <div className="hidden lg:block">
                <UserAuthNav />
              </div>
              {/* Mobile Hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-cream-100 hover:text-gold-300 transition-colors duration-200"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <div
          className={[
            'lg:hidden overflow-hidden transition-all duration-500 ease-in-out',
            mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
        >
          <div className="bg-forest-950/98 border-t border-forest-800/50 backdrop-blur-md px-6 py-8">
            <div className="flex flex-col gap-6">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={mobileLinkClass(isActiveLink(link.href))}
                >
                  {link.label}
                </Link>
              ))}

              <UserAuthNav mobile />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
