'use client'

import { useState, useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { updateMechanicProfile } from './actions'

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

type MechanicProfile = {
  display_name: string
  business_name: string | null
  phone: string | null
  bio: string | null
  certifications: string | null
  service_radius_miles: number
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  specialties: string[]
  is_verified: boolean
  avg_rating: number | null
  quotes_sent_count: number
  quotes_accepted_count: number
}

export default function MechanicProfileClient({ profile }: { profile: MechanicProfile | null }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties ?? [])

  function toggleSpecialty(value: string) {
    setSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    specialties.forEach((s) => fd.append('specialties[]', s))
    startTransition(async () => {
      const result = await updateMechanicProfile(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <p className="mb-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-forest-700">
          Mechanic Partner
        </p>
        <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          Edit Profile
        </h1>
        {profile?.is_verified && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Verified Partner
          </span>
        )}
      </div>

      {/* Stats */}
      {profile && (
        <div className="mb-6 grid grid-cols-3 divide-x divide-neutral-100 rounded-2xl border border-neutral-200 bg-white text-center py-4">
          <div>
            <p className="text-xl font-bold text-neutral-900">{profile.quotes_sent_count}</p>
            <p className="text-xs text-neutral-500">Quotes sent</p>
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">{profile.quotes_accepted_count}</p>
            <p className="text-xs text-neutral-500">Accepted</p>
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">{profile.avg_rating?.toFixed(1) ?? '—'}</p>
            <p className="text-xs text-neutral-500">Avg rating</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-sans text-base font-bold text-neutral-900">Profile info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Display name *</span>
              <input name="display_name" defaultValue={profile?.display_name} required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Business name</span>
              <input name="business_name" defaultValue={profile?.business_name ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Phone</span>
              <input name="phone" type="tel" defaultValue={profile?.phone ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Service radius (miles)</span>
              <input name="service_radius_miles" type="number" min={1} max={200} defaultValue={profile?.service_radius_miles ?? 25} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Bio</span>
            <textarea name="bio" rows={3} defaultValue={profile?.bio ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Certifications</span>
            <input name="certifications" defaultValue={profile?.certifications ?? ''} placeholder="e.g. ASE, AAA Approved" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
          </label>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-sans text-base font-bold text-neutral-900">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-neutral-700">Street address</span>
              <input name="address_street" defaultValue={profile?.address_street ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">City</span>
              <input name="address_city" defaultValue={profile?.address_city ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">State</span>
              <input name="address_state" defaultValue={profile?.address_state ?? ''} maxLength={2} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 uppercase" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">ZIP code</span>
              <input name="address_zip" defaultValue={profile?.address_zip ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-sans text-base font-bold text-neutral-900">Specialties</h2>
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
                  {selected && <CheckCircle className="absolute top-2 right-2 h-3.5 w-3.5 text-forest-700" />}
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Profile saved!</div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition"
        >
          {isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
