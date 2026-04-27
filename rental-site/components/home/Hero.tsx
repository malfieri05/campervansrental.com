'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, MapPin, Calendar, Users, Search } from 'lucide-react'
import Image from 'next/image'
import Button from '@/components/ui/Button'

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

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  const [location, setLocation] = useState('')
  const [guests, setGuests] = useState(2)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section className="relative -mt-20 min-h-screen flex flex-col overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1920"
          alt="Luxury camper van in nature"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Multi-layer gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/40 to-forest-950/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/50 via-transparent to-forest-950/30" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-48">
        {/* Gold label */}
        <motion.div
          variants={fadeUpVariant}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-px w-12 bg-gold-400/60" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold-400">
            Luxury Camper Van Rentals
          </span>
          <div className="h-px w-12 bg-gold-400/60" />
        </motion.div>

        {/* Main headline */}
        <motion.h1
          variants={fadeUpVariant}
          initial="hidden"
          animate="visible"
          custom={0.4}
          className="font-serif text-cream-50 font-700 leading-[1.05] mb-8 text-shadow-luxury max-w-4xl"
          style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}
        >
          The World Is Your{' '}
          <span className="luxury-text-gradient italic">Living Room.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUpVariant}
          initial="hidden"
          animate="visible"
          custom={0.6}
          className="font-sans text-cream-200/75 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed font-light"
        >
          Premium camper vans crafted for those who refuse to choose between
          wilderness and luxury.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUpVariant}
          initial="hidden"
          animate="visible"
          custom={0.8}
          className="flex justify-center"
        >
          <Button href="/fleet" variant="primary" size="lg">
            Explore Our Fleet
          </Button>
        </motion.div>
      </div>

      {/* Floating Booking Bar */}
      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        animate="visible"
        custom={1.0}
        className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-0"
      >
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-t-2xl shadow-luxury border border-cream-200/20 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-cream-300/20">
              {/* Pickup Location */}
              <div className="flex items-center gap-3 px-6 py-5">
                <MapPin className="w-5 h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-1">
                    Pickup Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="">Select a location</option>
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pick Up Date */}
              <div className="flex items-center gap-3 px-6 py-5">
                <Calendar className="w-5 h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-1">
                    Pick Up
                  </label>
                  <input
                    type="date"
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Return Date */}
              <div className="flex items-center gap-3 px-6 py-5">
                <Calendar className="w-5 h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-1">
                    Return
                  </label>
                  <input
                    type="date"
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Guests + Search */}
              <div className="flex items-center gap-3 px-6 py-5">
                <Users className="w-5 h-5 text-gold-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-forest-700 block mb-1">
                    Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-transparent font-sans text-sm text-charcoal font-medium focus:outline-none cursor-pointer appearance-none"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="ml-2 w-11 h-11 bg-gold-400 hover:bg-gold-300 rounded-sm flex items-center justify-center transition-colors duration-200 flex-shrink-0 shadow-gold">
                  <Search className="w-5 h-5 text-forest-950" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(4rem+80px)] z-10"
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
