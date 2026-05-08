'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronDown, MapPin, Calendar, Users, Search } from 'lucide-react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import HeroDatePopover from '@/components/home/HeroDatePopover'

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const locationOptions = [
  'Denver, CO',
  'Salt Lake City, UT',
  'Bozeman, MT',
  'Aspen, CO',
  'Portland, OR',
  'Seattle, WA',
]

/** Hero headline: cream bookends, larger gold italic center line */
const HERO_HEADLINE_BASE = 'clamp(1.85rem, 4.5vw, 3.35rem)'
const HERO_HEADLINE_ACCENT = 'clamp(2.035rem, 4.95vw, 3.685rem)'

function formatDateLabel(iso: string): string {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export default function Hero() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [location, setLocation] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const [datePopover, setDatePopover] = useState<'checkIn' | 'checkOut' | null>(null)
  const pickUpDateCellRef = useRef<HTMLDivElement>(null)
  const returnDateCellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (location) params.set('listing', location)
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    params.set('guests', String(guests))
    router.push(`/booking?${params.toString()}`)
  }

  if (!mounted) return null

  return (
    <section className="relative -mt-20 min-h-screen flex flex-col overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/heroimage.png"
          alt="Luxury camper van in nature"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Multi-layer gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/50 via-forest-950/30 to-forest-950/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/35 via-transparent to-forest-950/25" />
      </div>

      {/* Main content — halfway between centered and prior -15vh lift */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-48">
        <div className="flex w-full max-w-5xl flex-col items-center -translate-y-[7.5vh]">
          <motion.h1
            variants={fadeUpVariant}
            initial="hidden"
            animate="visible"
            custom={0.35}
            className="flex flex-col items-center gap-1 sm:gap-1.5 mb-12 max-w-5xl text-center"
          >
            <span
              className="font-serif font-bold text-cream-50 text-shadow-luxury leading-tight block"
              style={{ fontSize: HERO_HEADLINE_BASE }}
            >
              Your
            </span>
            <span
              className="font-serif font-bold italic text-gold-400 text-shadow-luxury leading-tight block"
              style={{ fontSize: HERO_HEADLINE_ACCENT }}
            >
              Camper Van Adventure
            </span>
            <span
              className="font-serif font-bold text-cream-50 text-shadow-luxury leading-tight block"
              style={{ fontSize: HERO_HEADLINE_BASE }}
            >
              Awaits
            </span>
          </motion.h1>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUpVariant}
            initial="hidden"
            animate="visible"
            custom={0.55}
            className="flex justify-center"
          >
            <Button href="/fleet" variant="primary" size="lg">
              Explore Our Fleet
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Floating Booking Bar — inset from hero bottom, full rounded rect */}
      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        animate="visible"
        custom={1.0}
        className="absolute bottom-5 left-0 right-0 z-20 px-4 sm:bottom-9 sm:px-6"
      >
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-2xl shadow-luxury ring-1 ring-black/10 overflow-hidden border border-cream-200/30">
            {/* Mobile: 2-col compact grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-cream-300/20">
              {/* Pickup Location — spans full width on mobile */}
              <div className="col-span-2 md:col-span-1 flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-5 border-b border-cream-300/20 md:border-b-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.6rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-0.5">
                    Pickup Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="">Select a location</option>
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pick Up Date — full-cell tap opens native picker (Safari-safe via showPicker) */}
              <div
                ref={pickUpDateCellRef}
                className="relative flex min-h-[4.25rem] items-center gap-3 border-b border-cream-300/20 px-4 py-3 sm:px-6 sm:py-5 md:border-b-0 md:border-l border-cream-300/20"
              >
                <Calendar className="relative z-0 h-4 w-4 shrink-0 text-gold-500 sm:h-5 sm:w-5 pointer-events-none" aria-hidden />
                <div className="relative z-0 min-w-0 flex-1 pointer-events-none">
                  <span className="font-display mb-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.15em] text-forest-700">
                    Pick Up
                  </span>
                  <span className="font-sans block text-sm font-medium text-charcoal">
                    {checkIn ? formatDateLabel(checkIn) : <span className="text-charcoal/40">Add date</span>}
                  </span>
                </div>
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-pointer rounded-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400/70"
                  aria-label="Pick up date"
                  onClick={() =>
                    setDatePopover((prev) => (prev === 'checkIn' ? null : 'checkIn'))
                  }
                  aria-expanded={datePopover === 'checkIn'}
                />
              </div>

              {/* Return Date */}
              <div
                ref={returnDateCellRef}
                className="relative flex min-h-[4.25rem] items-center gap-3 border-l border-cream-300/20 px-4 py-3 sm:px-6 sm:py-5"
              >
                <Calendar className="relative z-0 h-4 w-4 shrink-0 text-gold-500 sm:h-5 sm:w-5 pointer-events-none" aria-hidden />
                <div className="relative z-0 min-w-0 flex-1 pointer-events-none">
                  <span className="font-display mb-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.15em] text-forest-700">
                    Return
                  </span>
                  <span className="font-sans block text-sm font-medium text-charcoal">
                    {checkOut ? formatDateLabel(checkOut) : <span className="text-charcoal/40">Add date</span>}
                  </span>
                </div>
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-pointer rounded-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400/70"
                  aria-label="Return date"
                  onClick={() =>
                    setDatePopover((prev) => (prev === 'checkOut' ? null : 'checkOut'))
                  }
                  aria-expanded={datePopover === 'checkOut'}
                />
              </div>

              {/* Guests + Search */}
              <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-5 border-l border-cream-300/20">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.6rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-0.5">
                    Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer appearance-none"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSearch}
                  aria-label="Search"
                  className="ml-1 w-10 h-10 sm:w-11 sm:h-11 bg-gold-400 hover:bg-gold-300 rounded-sm flex items-center justify-center transition-colors duration-200 flex-shrink-0 shadow-gold"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-forest-950" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {datePopover && (
        <HeroDatePopover
          open={!!datePopover}
          field={datePopover}
          value={datePopover === 'checkIn' ? checkIn : checkOut}
          checkIn={checkIn}
          onSelect={(iso) => {
            if (datePopover === 'checkIn') {
              setCheckIn(iso)
              if (checkOut && checkOut <= iso) setCheckOut('')
            } else setCheckOut(iso)
            setDatePopover(null)
          }}
          onClear={() => {
            if (datePopover === 'checkIn') {
              setCheckIn('')
              setCheckOut('')
            } else setCheckOut('')
            setDatePopover(null)
          }}
          onClose={() => setDatePopover(null)}
          pickUpAnchorRef={pickUpDateCellRef}
          returnAnchorRef={returnDateCellRef}
        />
      )}

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(4rem+112px)] z-10"
      >
        <div className="flex flex-col items-center gap-2 text-cream-100/40">
          <span className="font-display text-[0.6rem] uppercase tracking-[0.2em]">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
