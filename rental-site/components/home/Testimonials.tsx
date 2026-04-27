'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star, Quote } from 'lucide-react'
import { testimonials } from '@/lib/data'

export default function Testimonials() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <section className="bg-forest-950 py-24 px-6 lg:px-10 overflow-hidden">
      {/* Gold top accent */}
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16" ref={sectionRef}>
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/60" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-400">
              Testimonials
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <h2
            className="font-serif text-cream-50 font-bold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
          >
            Voices from the Road
          </h2>
          <p className="font-sans text-cream-200/50 text-lg mt-4 max-w-xl mx-auto">
            Do not take our word for it. Here is what our guests say after living the experience.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: index * 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-forest-900/60 border border-forest-800/60 rounded-sm p-8 flex flex-col gap-6 hover:border-gold-500/20 hover:bg-forest-900/80 transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-gold-500/30" strokeWidth={1} />

              {/* Rating */}
              <div className="flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-gold-400"
                    fill="#e0a82a"
                    strokeWidth={0}
                  />
                ))}
              </div>

              {/* Quote text */}
              <blockquote className="font-serif italic text-cream-100/80 text-sm leading-relaxed flex-1">
                &ldquo;{testimonial.text}&rdquo;
              </blockquote>

              {/* Divider */}
              <div className="h-px bg-forest-700/50" />

              {/* Author */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.1em] text-cream-100">
                    {testimonial.name}
                  </p>
                </div>
                <p className="font-sans text-xs text-cream-200/40">
                  {testimonial.location}
                </p>
                <p className="font-serif italic text-xs text-gold-400/70 mt-1.5">
                  {testimonial.trip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-16 pt-12 border-t border-forest-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Adventures Completed' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '12', label: 'Premium Vans' },
              { value: '50', label: 'States Explored' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-serif text-3xl font-bold text-gold-400 mb-2">
                  {stat.value}
                </div>
                <div className="font-display text-xs uppercase tracking-[0.15em] text-cream-200/40 font-semibold">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
