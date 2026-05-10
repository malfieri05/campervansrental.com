'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Layers, Gauge, Mountain } from 'lucide-react'

const pillars = [
  {
    icon: Layers,
    title: 'Full marketplace structure',
    body:
      'Calendars, bookings, and host tools patterned after what works on the biggest rental platforms—so nothing feels improvised.',
  },
  {
    icon: Gauge,
    title: 'Owners steer pricing',
    body:
      'Hosts set rates and fees with room to breathe. Less middleman markup means the same trip often costs travelers less out the door.',
  },
  {
    icon: Mountain,
    title: 'Built by people who camp',
    body:
      'Camping enthusiasts and van owners who got tired of rising platform fees—for renters and hosts alike. Fair search-to-return was the goal.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export default function HowItWorks() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="our-platform"
      ref={sectionRef}
      className="relative overflow-hidden bg-cream-100 px-6 py-14 sm:py-24 lg:px-10"
    >
      {/* Soft ambient accents */}
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-gold-400/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-forest-900/6 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 flex flex-col items-center text-center sm:mb-14"
        >
          <div className="mb-5 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              Our platform
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400" />
          </div>

          <h2
            className="max-w-3xl font-serif font-bold leading-tight text-charcoal"
            style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)' }}
          >
            Big-platform polish—without the excess fees.
          </h2>
        </motion.div>

        {/* Narrative + image — wider image column; photo uses intrinsic aspect (no cover crop) */}
        <div className="mb-16 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10 xl:gap-14">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="order-2 max-w-xl lg:order-1 lg:max-w-none lg:pr-2"
          >
            <div className="mb-6 rounded-xl border border-gold-400/25 bg-white/40 px-5 py-4 backdrop-blur-sm ring-1 ring-black/[0.03]">
              <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-forest-800">
                What that means for you
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-charcoal/60">
                All of the structure and support you get from a major rental marketplace, without a
                greedy middleman.
              </p>
            </div>
            <p className="font-sans text-base leading-relaxed text-charcoal/65 sm:text-[1.05rem]">
              This platform was built by camping enthusiasts and van owners who were tired of the
              ever-increasing fees alternative platforms forced onto renters and owners. We wanted a
              rental home where hosts keep meaningful control over what guests are charged—so we can
              deliver the same attentive, full-service experience travelers deserve at a lower total
              cost.
            </p>
          </motion.div>

          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="relative order-1 lg:order-2"
          >
            <div className="relative mx-auto w-full max-w-xl lg:max-w-2xl lg:justify-self-end">
              <Image
                src="/vanmountain.png"
                alt="Guests enjoying breakfast with a mountain view from the back of a camper van"
                width={600}
                height={450}
                className="relative z-10 h-auto w-full rounded-2xl shadow-luxury ring-1 ring-gold-400/20"
                sizes="(max-width: 1024px) 100vw, min(640px, 55vw)"
              />
              <div
                className="pointer-events-none absolute -bottom-3 -right-3 left-3 top-3 -z-10 hidden rounded-2xl border border-gold-400/35 sm:block"
                aria-hidden
              />
            </div>
          </motion.div>
        </div>

        {/* Pillars */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon
            return (
              <motion.div
                key={pillar.title}
                custom={index + 2}
                variants={fadeUp}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                className="group relative rounded-2xl border border-cream-300/60 bg-white/50 px-6 py-7 shadow-luxury-sm backdrop-blur-[2px] transition-shadow duration-300 hover:shadow-luxury"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/35 bg-forest-900 shadow-luxury-sm transition-transform duration-300 group-hover:scale-[1.03]">
                  <Icon className="h-5 w-5 text-gold-400" strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 font-serif text-lg font-semibold text-charcoal">{pillar.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-charcoal/58">{pillar.body}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
