'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, MapPin, Calendar, Users, Star, ArrowLeft } from 'lucide-react'
import { Van } from '@/types'
import { getCategoryLabel, formatVanLengthFt } from '@/lib/data'
import Button from '@/components/ui/Button'

const steps = [
  { number: 1, label: 'Search' },
  { number: 2, label: 'Choose Van' },
  { number: 3, label: 'Your Details' },
  { number: 4, label: 'Confirm' },
]

const locationOptions = [
  'Denver, CO',
  'Salt Lake City, UT',
  'Bozeman, MT',
  'Aspen, CO',
  'Portland, OR',
  'Seattle, WA',
] as const

interface FormData {
  location: string
  startDate: string
  endDate: string
  guests: number
  selectedVanId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequests: string
}

function validDateOrder(start: string, end: string) {
  if (!start || !end) return false
  const a = new Date(start + 'T12:00:00')
  const b = new Date(end + 'T12:00:00')
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return b > a
}

function matchVanLocationToOption(vanLocation: string) {
  const v = vanLocation.trim()
  if (!v) return locationOptions[0]
  const exact = locationOptions.find((o) => o === v)
  if (exact) return exact
  const head = v.split(',')[0]?.trim().toLowerCase() ?? ''
  const fuzzy = locationOptions.find(
    (o) => head && (o.toLowerCase().includes(head) || o.toLowerCase().startsWith(head.slice(0, 4)))
  )
  return fuzzy ?? locationOptions[0]
}

type WizardSeed = {
  step: number
  form: FormData
  /** Landed from listing with dates — Back from step 3 returns to that listing */
  fromListingWithDates: boolean
}

function buildInitialWizardState(
  initialListings: Van[],
  preselectSlug?: string,
  initialCheckIn?: string,
  initialCheckOut?: string,
  initialGuests?: number
): WizardSeed {
  const form: FormData = {
    location: '',
    startDate: '',
    endDate: '',
    guests: 2,
    selectedVanId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
  }
  let step = 1
  let fromListingWithDates = false

  if (preselectSlug) {
    const van = initialListings.find((v) => v.id === preselectSlug)
    if (van) {
      form.selectedVanId = van.id
      form.location = matchVanLocationToOption(van.location)
      if (initialGuests != null && initialGuests >= 1 && initialGuests <= 4) {
        form.guests = initialGuests
      }
      const cin = initialCheckIn?.trim()
      const cout = initialCheckOut?.trim()
      if (cin && cout && validDateOrder(cin, cout)) {
        form.startDate = cin
        form.endDate = cout
        step = 3
        fromListingWithDates = true
      }
    }
  }

  return { step, form, fromListingWithDates }
}

export default function BookingWizard({
  initialListings,
  preselectSlug,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: {
  initialListings: Van[]
  preselectSlug?: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
}) {
  const router = useRouter()
  const seed = useMemo(
    () =>
      buildInitialWizardState(
        initialListings,
        preselectSlug,
        initialCheckIn,
        initialCheckOut,
        initialGuests
      ),
    [initialListings, preselectSlug, initialCheckIn, initialCheckOut, initialGuests]
  )
  const [currentStep, setCurrentStep] = useState(seed.step)
  const [form, setForm] = useState<FormData>(seed.form)

  const updateForm = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const goNext = () => {
    if (
      currentStep === 1 &&
      form.selectedVanId &&
      form.location &&
      form.startDate &&
      form.endDate &&
      nights > 0
    ) {
      setCurrentStep(3)
      return
    }
    // When entering step 4 from a listing-with-dates origin, redirect to the
    // Outdoorsy-style review route instead of the old wizard confirmation step.
    if (currentStep === 3 && seed.fromListingWithDates && form.selectedVanId) {
      const params = new URLSearchParams({
        start: form.startDate,
        end: form.endDate,
        guests: String(form.guests),
      })
      router.push(`/listings/${form.selectedVanId}/request?${params.toString()}`)
      return
    }
    setCurrentStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    if (currentStep === 3 && seed.fromListingWithDates && form.selectedVanId) {
      router.push(`/listings/${form.selectedVanId}`)
      return
    }
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  const selectedVan = initialListings.find((v) => v.id === form.selectedVanId)

  const getNights = () => {
    if (!form.startDate || !form.endDate) return 0
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const nights = getNights()
  const totalPrice = selectedVan ? selectedVan.pricePerNight * nights : 0
  const grandTotal = totalPrice

  const canProceed = () => {
    if (currentStep === 1) return form.location && form.startDate && form.endDate && nights > 0
    if (currentStep === 2) return !!form.selectedVanId
    if (currentStep === 3) return form.firstName && form.lastName && form.email && form.phone
    return true
  }

  const inputClasses =
    'w-full bg-cream-50 border border-cream-300 text-charcoal text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500/20 transition-all font-sans placeholder:text-charcoal/30'

  const labelClasses =
    'block font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-forest-700 mb-2'

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Page Header */}
      <div className="bg-forest-900 py-8 sm:py-12 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-cream-50 font-bold text-3xl md:text-4xl mb-2">
            Reserve Your Van
          </h1>
          <p className="font-sans text-cream-200/60 text-sm">
            {seed.fromListingWithDates
              ? 'You already chose this van and your trip dates. Add your details below to continue.'
              : 'Complete the steps below to secure your luxury adventure.'}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-cream-50 border-b border-cream-300/60 py-5 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={[
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all duration-300',
                      currentStep > step.number
                        ? 'bg-forest-600 text-cream-50'
                        : currentStep === step.number
                        ? 'bg-gold-400 text-forest-950'
                        : 'bg-cream-300 text-charcoal/40',
                    ].join(' ')}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={[
                      'font-display text-xs font-semibold uppercase tracking-[0.1em] hidden sm:block',
                      currentStep === step.number
                        ? 'text-forest-800'
                        : currentStep > step.number
                        ? 'text-forest-600'
                        : 'text-charcoal/30',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={[
                      'flex-1 h-px mx-4 transition-all duration-300',
                      currentStep > step.number
                        ? 'bg-forest-400'
                        : 'bg-cream-300',
                    ].join(' ')}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Step 1: Search */}
        {currentStep === 1 && (
          <div className="bg-cream-50 rounded-sm border border-cream-300/60 p-5 sm:p-8 shadow-luxury-sm">
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-6 sm:mb-8">
              Where and When?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClasses}>
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />
                  Pickup Location
                </label>
                <select
                  value={form.location}
                  onChange={(e) => updateForm('location', e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Select a pickup location</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />
                  Pick Up Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm('startDate', e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />
                  Return Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm('endDate', e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>
                  <Users className="inline w-3.5 h-3.5 mr-1" />
                  Number of Guests
                </label>
                <select
                  value={form.guests}
                  onChange={(e) => updateForm('guests', Number(e.target.value))}
                  className={inputClasses}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
              {nights > 0 && (
                <div className="flex items-center">
                  <div className="bg-forest-50 border border-forest-200/60 rounded-sm px-4 py-3">
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-forest-700">
                      {nights} night{nights !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Van Selection */}
        {currentStep === 2 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-8">
              Choose Your Van
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {initialListings
                .filter((van) => van.sleeps >= form.guests)
                .map((van) => (
                  <VanSelectionCard
                    key={van.id}
                    van={van}
                    selected={form.selectedVanId === van.id}
                    nights={nights}
                    onSelect={() => updateForm('selectedVanId', van.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === 3 && (
          <div className="bg-cream-50 rounded-sm border border-cream-300/60 p-5 sm:p-8 shadow-luxury-sm">
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-6 sm:mb-8">
              Your Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  placeholder="Jane"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  placeholder="Smith"
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="jane@example.com"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>Special Requests (Optional)</label>
                <textarea
                  value={form.specialRequests}
                  onChange={(e) => updateForm('specialRequests', e.target.value)}
                  placeholder="Dietary requirements for pre-stocking, accessibility needs, or anything else we should know..."
                  rows={4}
                  className={`${inputClasses} resize-none`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && selectedVan && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-semibold text-charcoal mb-8">
              Review Your Booking
            </h2>

            {/* Van Summary */}
            <div className="bg-cream-50 rounded-sm border border-cream-300/60 overflow-hidden shadow-luxury-sm">
              <div className="flex flex-col md:flex-row">
                <div className="relative w-full md:w-56 h-48 md:h-auto flex-shrink-0">
                  <Image
                    src={selectedVan.images[0]}
                    alt={selectedVan.name}
                    fill
                    className="object-cover"
                    sizes="224px"
                  />
                </div>
                <div className="p-6 flex-1">
                  <p className="font-display text-xs font-bold uppercase tracking-widest text-gold-500 mb-1">
                    {getCategoryLabel(selectedVan.category)}
                  </p>
                  <h3 className="font-serif text-xl font-semibold text-charcoal mb-1">
                    {selectedVan.name}
                  </h3>
                  <p className="font-sans text-sm text-charcoal/50 mb-4">{selectedVan.tagline}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40">Pickup</span>
                      <p className="font-sans font-medium text-charcoal">{form.location}</p>
                    </div>
                    <div>
                      <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40">Guests</span>
                      <p className="font-sans font-medium text-charcoal">{form.guests}</p>
                    </div>
                    <div>
                      <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40">Check In</span>
                      <p className="font-sans font-medium text-charcoal">{form.startDate}</p>
                    </div>
                    <div>
                      <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40">Check Out</span>
                      <p className="font-sans font-medium text-charcoal">{form.endDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-cream-50 rounded-sm border border-cream-300/60 p-6 shadow-luxury-sm">
              <h3 className="font-serif text-lg font-semibold text-charcoal mb-5">
                Price Breakdown
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-sans text-charcoal/60">
                    ${selectedVan.pricePerNight} × {nights} nights
                  </span>
                  <span className="font-sans font-medium text-charcoal">
                    ${totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-cream-300 my-2" />
                <div className="flex justify-between font-semibold">
                  <span className="font-display text-sm uppercase tracking-widest text-charcoal">Trip total</span>
                  <span className="font-serif text-xl text-gold-600">
                    ${grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="bg-cream-50 rounded-sm border border-cream-300/60 p-6 shadow-luxury-sm">
              <h3 className="font-serif text-lg font-semibold text-charcoal mb-4">
                Guest Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40 block mb-1">Name</span>
                  <span className="font-sans font-medium text-charcoal">
                    {form.firstName} {form.lastName}
                  </span>
                </div>
                <div>
                  <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40 block mb-1">Email</span>
                  <span className="font-sans font-medium text-charcoal">{form.email}</span>
                </div>
                <div>
                  <span className="font-display text-[0.65rem] uppercase tracking-widest text-charcoal/40 block mb-1">Phone</span>
                  <span className="font-sans font-medium text-charcoal">{form.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-charcoal/60 hover:text-charcoal transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              variant="primary"
              size="md"
              disabled={!canProceed()}
              onClick={goNext}
            >
              {currentStep === 3 && seed.fromListingWithDates ? 'Review request' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {!selectedVan?.listingUuid && (
                <p className="font-sans text-xs text-charcoal/50 max-w-xs text-right">
                  Online reservation checkout is available for live marketplace listings. Configure
                  Supabase and publish a host listing to enable payment.
                </p>
              )}
              <Button
                variant="primary"
                size="lg"
                disabled={!selectedVan?.listingUuid}
                onClick={() => {
                  if (!selectedVan?.listingUuid) return
                  const draft = {
                    pickupLocation: form.location,
                    guestFirstName: form.firstName,
                    guestLastName: form.lastName,
                    guestEmail: form.email,
                    guestPhone: form.phone,
                    specialRequests: form.specialRequests,
                  }
                  try {
                    sessionStorage.setItem('checkoutDraft', JSON.stringify(draft))
                  } catch {
                    /* ignore */
                  }
                  const q = new URLSearchParams({
                    listing: selectedVan.listingUuid,
                    start: form.startDate,
                    end: form.endDate,
                    guests: String(form.guests),
                  })
                  router.push(`/checkout?${q.toString()}`)
                }}
              >
                Continue to payment
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VanSelectionCard({
  van,
  selected,
  nights,
  onSelect,
}: {
  van: Van
  selected: boolean
  nights: number
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'text-left rounded-sm border-2 overflow-hidden transition-all duration-300 w-full',
        selected
          ? 'border-gold-400 shadow-gold'
          : 'border-cream-300/60 hover:border-forest-300',
      ].join(' ')}
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={van.images[0]}
          alt={van.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 to-transparent" />
        {selected && (
          <div className="absolute top-3 right-3 w-7 h-7 bg-gold-400 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-forest-950" strokeWidth={2.5} />
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className="font-display text-[0.6rem] font-bold uppercase tracking-widest bg-forest-950/80 text-cream-100 px-2.5 py-1 rounded-sm">
            {getCategoryLabel(van.category)}
          </span>
        </div>
      </div>
      <div className="bg-cream-50 p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-lg font-semibold text-charcoal">{van.name}</h3>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-gold-400" fill="#e0a82a" strokeWidth={0} />
            <span className="font-display text-xs font-bold text-charcoal">{van.rating}</span>
          </div>
        </div>
        <p className="font-sans text-xs text-charcoal/50 mb-3">
          Sleeps {van.sleeps} &bull; {formatVanLengthFt(van.length) ?? van.length}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-serif text-xl font-semibold text-gold-500">
              ${van.pricePerNight}
            </span>
            <span className="font-sans text-xs text-charcoal/40">/night</span>
          </div>
          {nights > 0 && (
            <span className="font-sans text-xs text-charcoal/40">
              ${(van.pricePerNight * nights).toLocaleString()} total
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
