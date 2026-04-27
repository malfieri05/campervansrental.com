'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, X, Tent, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import UserAuthNav from '@/components/layout/UserAuthNav'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'

const guestLinks = [{ label: 'Fleet', href: '/fleet' }]

const hostLinks = [
  { label: 'Home', href: '/host' },
  { label: 'Listings', href: '/host/listings' },
  { label: 'Calendar', href: '/host/calendar' },
]

const bookingStatuses = [
  { label: 'Pending', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled' },
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

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bookingsOpen, setBookingsOpen] = useState(false)
  const bookingsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHost = useIsHost()

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

  // Close bookings dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bookingsRef.current && !bookingsRef.current.contains(e.target as Node)) {
        setBookingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navbarClasses = [
    'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out',
    'border-b border-forest-900/40 bg-forest-950/95 backdrop-blur-md shadow-sm',
    scrolled ? 'shadow-luxury border-forest-800/50' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const isActiveBookings = pathname.startsWith('/host/bookings')

  const currentStatus = searchParams.get('status') ?? ''

  const desktopLinkClass = (active: boolean) =>
    [
      'font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors duration-300 relative group',
      active ? 'text-gold-300' : 'text-cream-200/80 hover:text-gold-300',
    ].join(' ')

  const mobileLinkClass = (active: boolean) =>
    [
      'font-display text-sm font-semibold uppercase tracking-[0.15em] transition-colors duration-200 border-b border-forest-800/40 pb-4',
      active ? 'text-gold-300' : 'text-cream-100/80 hover:text-gold-300',
    ].join(' ')

  const links = isHost ? hostLinks : guestLinks

  return (
    <>
      <nav className={navbarClasses}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 bg-gold-400 flex items-center justify-center rounded-sm group-hover:bg-gold-300 transition-colors duration-300">
                  <Tent className="w-5 h-5 text-forest-950" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gold-300 rounded-full opacity-70" />
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

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-10">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={desktopLinkClass(isActiveLink(link.href))}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 left-0 h-px bg-gold-400 transition-all duration-300 ${isActiveLink(link.href) ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              ))}

              {/* Bookings dropdown — host only */}
              {isHost && (
                <div className="relative" ref={bookingsRef}>
                  <button
                    type="button"
                    onClick={() => setBookingsOpen((o) => !o)}
                    className={desktopLinkClass(isActiveBookings)}
                  >
                    <span className="flex items-center gap-1">
                      Bookings
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${bookingsOpen ? 'rotate-180' : ''}`} />
                    </span>
                    <span className={`absolute -bottom-1 left-0 h-px bg-gold-400 transition-all duration-300 ${isActiveBookings ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                  </button>

                  {bookingsOpen && (
                    <div className="absolute left-0 top-full mt-3 w-44 rounded-xl border border-forest-800 bg-forest-950 shadow-luxury py-2 z-[60] ring-1 ring-black/20">
                      {bookingStatuses.map(({ label, status }) => {
                        const active = isActiveBookings && currentStatus === status
                        return (
                          <Link
                            key={status}
                            href={`/host/bookings?status=${status}`}
                            onClick={() => setBookingsOpen(false)}
                            className={[
                              'flex items-center px-4 py-2.5 text-xs font-display uppercase tracking-[0.1em] transition-colors',
                              active
                                ? 'text-gold-300 bg-forest-800'
                                : 'text-cream-100 hover:text-gold-300 hover:bg-forest-800/80',
                            ].join(' ')}
                          >
                            {label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop auth + CTA */}
            <div className="hidden lg:flex items-center gap-4">
              <UserAuthNav />
              {!isHost && (
                <Button href="/booking" variant="primary" size="sm">
                  Book Now
                </Button>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-cream-100 hover:text-gold-300 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={mobileLinkClass(isActiveLink(link.href))}
                >
                  {link.label}
                </Link>
              ))}

              {/* Bookings sub-links — host only */}
              {isHost && (
                <div className="flex flex-col gap-0">
                  <span className={mobileLinkClass(isActiveBookings)}>Bookings</span>
                  <div className="pl-4 flex flex-col gap-3 mt-3">
                    {bookingStatuses.map(({ label, status }) => {
                      const active = isActiveBookings && currentStatus === status
                      return (
                        <Link
                          key={status}
                          href={`/host/bookings?status=${status}`}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            'font-display text-xs uppercase tracking-[0.12em] transition-colors',
                            active ? 'text-gold-300' : 'text-cream-200/60 hover:text-gold-300',
                          ].join(' ')}
                        >
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              <UserAuthNav mobile />
              {!isHost && (
                <div className="pt-2">
                  <Button
                    href="/booking"
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => setMobileOpen(false)}
                  >
                    Book Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
