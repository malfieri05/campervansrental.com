'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import SiteLogo from '@/components/layout/SiteLogo'
import UserAuthNav from '@/components/layout/UserAuthNav'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'
import { isVehicleHealthUiEnabled } from '@/lib/feature-flags'

// useLayoutEffect logs a warning during SSR. Swap to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const travelerLinks = [
  { label: 'Home', href: '/' },
  { label: 'Browse', href: '/fleet' },
  { label: 'My Trips', href: '/trips' },
]

/** Hosts get dashboard-focused links (not traveler Browse / My Trips). */
const hostLinks = [
  { label: 'Home', href: '/host' },
  { label: 'Listings', href: '/host/listings' },
  { label: 'Calendar', href: '/host/calendar' },
  { label: 'Bookings', href: '/host/bookings' },
]

const mechanicLinks = [
  { label: 'Dashboard', href: '/mechanic/dashboard' },
  { label: 'Tasks', href: '/mechanic/tasks' },
  { label: 'Quotes', href: '/mechanic/quotes' },
  { label: 'Profile', href: '/mechanic/profile' },
]

/**
 * Single hook — one getSession() call instead of two (was useIsHost + useLoggedIn).
 * Removing framer-motion from this shared chunk saves ~30 kB on every route.
 */
function useNavAuth() {
  const [isHost, setIsHost] = useState<boolean | null>(null)
  const [isMechanic, setIsMechanic] = useState<boolean | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsHost(false)
      setIsMechanic(false)
      setLoggedIn(false)
      return
    }
    const supabase = createClient()

    async function applySession(userId: string | undefined) {
      if (!userId) {
        setLoggedIn(false)
        setIsHost(false)
        setIsMechanic(false)
        return
      }
      setLoggedIn(true)

      // Query is_host first (always present). is_mechanic was added by
      // migration 00019 — gracefully handle databases that haven't applied it.
      const { data: hostData } = await supabase
        .from('profiles')
        .select('is_host')
        .eq('id', userId)
        .single()
      setIsHost(hostData?.is_host ?? false)

      const { data: mechData } = await supabase
        .from('profiles')
        .select('is_mechanic')
        .eq('id', userId)
        .single()
      setIsMechanic(mechData?.is_mechanic ?? false)
    }

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.user?.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { isHost, isMechanic, loggedIn }
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { isHost, isMechanic, loggedIn } = useNavAuth()
  const vehicleHealthUiOn = isVehicleHealthUiEnabled()

  /** Mechanic marketplace tab bar only when Vehicle Health UI is enabled. */
  const showMechanicNav = isMechanic === true && vehicleHealthUiOn

  /** Logged-in travelers see Browse next to the profile; logged-out users do not. */
  const showBrowse =
    loggedIn === true && isHost === false && !showMechanicNav

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Close drawer on any route change
  useEffect(() => { closeMobile() }, [pathname, closeMobile])

  // Scroll-lock body while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

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

  /** `/` only highlights on exact match. `/host` only on exact match — sub-routes use Listings/Calendar/Bookings. */
  const isActiveLink = (href: string) => {
    if (pathname === href) return true
    if (href === '/' || href === '/host') return false
    return pathname.startsWith(`${href}/`)
  }

  const desktopLinkClass = (active: boolean) =>
    [
      'font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-300',
      'relative inline-block pb-1',
      active ? 'text-gold-300' : 'text-cream-200/80 hover:text-gold-300',
    ].join(' ')

  const mobileLinkClass = (active: boolean) =>
    [
      'font-display text-sm font-semibold uppercase tracking-[0.15em] transition-colors duration-200 border-b border-forest-800/40 pb-4',
      active ? 'text-gold-300' : 'text-cream-100/80 hover:text-gold-300',
    ].join(' ')

  // Memoize so the reference is stable across renders — otherwise the
  // measure effect would re-run on every render and cause an update loop.
  const activeLinks = useMemo(
    () =>
      isHost === true
        ? hostLinks
        : showMechanicNav
          ? mechanicLinks
          : showBrowse
            ? travelerLinks
            : [],
    [isHost, showMechanicNav, showBrowse],
  )
  const mobileNavLinks = activeLinks

  // ─── Sliding underline tracking ────────────────────────────────────────────
  const navTrackRef = useRef<HTMLDivElement | null>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [underline, setUnderline] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  })
  const [hasMeasured, setHasMeasured] = useState(false)

  const measureUnderline = useCallback(() => {
    const activeHref = activeLinks.find((l) => {
      if (pathname === l.href) return true
      if (l.href === '/') return false
      return pathname.startsWith(`${l.href}/`)
    })?.href
    const track = navTrackRef.current
    if (!activeHref || !track) {
      setUnderline((prev) => (prev.visible ? { ...prev, visible: false } : prev))
      return
    }
    const el = linkRefs.current[activeHref]
    if (!el) {
      setUnderline((prev) => (prev.visible ? { ...prev, visible: false } : prev))
      return
    }
    const elRect = el.getBoundingClientRect()
    const trackRect = track.getBoundingClientRect()
    const next = {
      left: elRect.left - trackRect.left,
      width: elRect.width,
      visible: true,
    }
    setUnderline((prev) =>
      prev.visible && prev.left === next.left && prev.width === next.width ? prev : next,
    )
  }, [activeLinks, pathname])

  useIsoLayoutEffect(() => {
    measureUnderline()
    if (!hasMeasured) {
      // Skip transition on the very first paint so the indicator appears
      // already-positioned rather than sliding in from (0, 0).
      const id = requestAnimationFrame(() => setHasMeasured(true))
      return () => cancelAnimationFrame(id)
    }
  }, [measureUnderline, hasMeasured])

  useEffect(() => {
    const onResize = () => measureUnderline()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measureUnderline])

  return (
    <>
      <nav className={navbarClasses}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {/* 1fr | auto | 1fr — nav track is truly centered in the bar (not offset by uneven logo vs. profile width) */}
          <div className="flex h-20 items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            {/* Logo */}
            <Link href="/" className="group flex shrink-0 items-center lg:justify-self-start">
              <SiteLogo
                priority
                className="transition-opacity group-hover:opacity-90"
                imageClassName="max-w-[min(96px,32vw)] sm:max-w-[148px]"
              />
            </Link>

            {/* Desktop Navigation — host, mechanic and traveler tabs centered */}
            <div
              ref={navTrackRef}
              className="relative hidden lg:flex items-center justify-center gap-10 lg:justify-self-center min-w-0"
            >
              {activeLinks.map((link) => {
                const active = isActiveLink(link.href)
                return (
                  <Link
                    key={link.href}
                    ref={(el) => {
                      linkRefs.current[link.href] = el
                    }}
                    href={link.href}
                    className={desktopLinkClass(active)}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {/* Sliding underline indicator — glides between the active tabs. */}
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 h-px bg-gold-400"
                style={{
                  left: underline.left,
                  width: underline.width,
                  opacity: underline.visible ? 1 : 0,
                  transition: hasMeasured
                    ? 'left 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease-out'
                    : 'opacity 220ms ease-out',
                }}
              />
            </div>

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

      </nav>

      {/* Mobile full-screen overlay — sits below the nav bar (top-20), above everything else */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-20 z-40 bg-black/50 lg:hidden"
            aria-hidden
            onClick={closeMobile}
          />
          {/* Panel */}
          <div className="fixed inset-x-0 top-20 z-50 lg:hidden bg-forest-950 border-t border-forest-800/50 overflow-y-auto max-h-[calc(100dvh-5rem)]">
            <div className="px-6 py-8 flex flex-col gap-6">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className={mobileLinkClass(isActiveLink(link.href))}
                >
                  {link.label}
                </Link>
              ))}
              <UserAuthNav mobile onMobileNavigate={closeMobile} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
