'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, MapPin, CheckCircle } from 'lucide-react'
import { becomeMechanic } from './actions'

const SPECIALTIES = [
  { value: 'oil_change', label: 'Oil Changes' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'brake_inspection', label: 'Brakes' },
  { value: 'transmission_fluid', label: 'Transmission' },
  { value: 'air_filter', label: 'Air Filters' },
  { value: 'coolant_flush', label: 'Cooling System' },
  { value: 'inspection', label: 'General Inspection' },
  { value: 'custom', label: 'Other / Custom' },
]

export default function MechanicSignupPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [specialties, setSpecialties] = useState<string[]>([])

  function toggleSpecialty(value: string) {
    setSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    specialties.forEach((s) => fd.append('specialties[]', s))
    startTransition(async () => {
      const result = await becomeMechanic(fd)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/mechanic/dashboard')
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 border border-forest-100">
          <Wrench className="h-8 w-8 text-forest-700" strokeWidth={1.5} />
        </div>
        <h1 className="font-sans text-3xl font-bold text-neutral-900">Become a Mechanic Partner</h1>
        <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
          Join our network of mobile mechanics and receive service requests from camper van owners in your area.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal/Business info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-sans text-base font-bold text-neutral-900">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Display name *</span>
              <input name="display_name" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Business name (optional)</span>
              <input name="business_name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Phone</span>
              <input name="phone" type="tel" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Service radius (miles)</span>
              <input name="service_radius_miles" type="number" min={1} max={200} defaultValue={25} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Bio</span>
            <textarea name="bio" rows={3} placeholder="Tell owners a bit about your experience and expertise…" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none" />
          </label>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <h2 className="font-sans text-base font-bold text-neutral-900">Service Location</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-neutral-700">Street address</span>
              <input name="address_street" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">City *</span>
              <input name="address_city" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">State *</span>
              <input name="address_state" required maxLength={2} placeholder="e.g. UT" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 uppercase" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">ZIP code</span>
              <input name="address_zip" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
          </div>
        </div>

        {/* Specialties */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-sans text-base font-bold text-neutral-900">Specialties</h2>
          <p className="text-sm text-neutral-500">Select all the service types you offer.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SPECIALTIES.map(({ value, label }) => {
              const selected = specialties.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSpecialty(value)}
                  className={`relative rounded-xl border px-3 py-3 text-sm font-medium text-left transition ${
                    selected
                      ? 'border-forest-700 bg-forest-50 text-forest-800'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {selected && (
                    <CheckCircle className="absolute top-2 right-2 h-3.5 w-3.5 text-forest-700" />
                  )}
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition"
        >
          {isPending ? 'Creating your profile…' : 'Join as a Mechanic Partner'}
        </button>
      </form>
    </div>
  )
}
