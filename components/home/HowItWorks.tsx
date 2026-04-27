'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Search, Sparkles, Map } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Choose Your Van',
    description:
      'Browse our curated fleet, select your ideal vehicle, pick your dates, and choose a pickup location. Our team is available to help you match the right van to your trip.',
    details: [
      'Filter by size, category, and features',
      'Flexible pickup locations across the West',
      'Real-time availability calendar',
    ],
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'We Prepare Everything',
    description:
      'We detail the van to perfection, stock it with your requested provisions, verify all systems, and ensure your adventure begins flawlessly the moment you turn the key.',
    details: [
      'Full professional detail before each rental',
      'Optional grocery and provision pre-stocking',
      'Personalized route recommendations included',
    ],
  },
  {
    number: '03',
    icon: Map,
    title: 'Explore in Luxury',
    description:
      'Hit the road knowing every detail has been handled. 24/7 concierge support, roadside assistance, and a fleet that performs as beautifully as it looks.',
    details: [
      '24/7 concierge and roadside support',
      'In-van guide with routes and recommendations',
      'Seamless check-in and check-out experience',
    ],
  },
]

export default function HowItWorks() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="bg-cream-100 py-24 px-6 lg:px-10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              The Process
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400" />
          </div>
          <h2
            className="font-serif text-charcoal font-bold mb-5 leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
          >
            How It Works
          </h2>
          <p className="font-sans text-charcoal/55 text-lg max-w-xl mx-auto">
            Three simple steps between you and the most extraordinary road trip of your life.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-16 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-gradient-to-r from-gold-400/30 via-gold-400/60 to-gold-400/30 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.7,
                    delay: index * 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Number + Icon Stack */}
                  <div className="relative mb-8">
                    {/* Big number behind */}
                    <span className="font-serif text-8xl font-bold text-gold-400/15 leading-none select-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      {step.number}
                    </span>
                    {/* Icon circle */}
                    <div className="relative w-16 h-16 rounded-full bg-forest-900 border-2 border-gold-400/30 flex items-center justify-center shadow-luxury-sm mx-auto mt-3">
                      <Icon className="w-7 h-7 text-gold-400" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-serif text-xl font-semibold text-charcoal mb-4">
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm text-charcoal/60 leading-relaxed mb-6 max-w-xs">
                    {step.description}
                  </p>

                  {/* Details */}
                  <ul className="space-y-2.5 text-left w-full max-w-xs">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0 mt-2" />
                        <span className="font-sans text-xs text-charcoal/55 leading-relaxed">
                          {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
