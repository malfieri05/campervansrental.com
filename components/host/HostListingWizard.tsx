'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ImageIcon } from 'lucide-react'
import type { Van } from '@/types'
import ListingCalendar from '@/components/listing/ListingCalendar'
import type { BlockRange } from '@/lib/availability'
import {
  addHostAvailabilityBlock,
  deleteListingImage,
  publishListing,
  removeHostAvailabilityBlock,
  reorderListingImages,
  saveListingImage,
  updateListing,
  type AddOn,
  type CancellationPolicy,
  type FAQ,
  type PricingRule,
} from '@/app/host/listings/actions'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/env'

// Step components
import VehicleStep from './wizard/steps/VehicleStep'
import DetailsStep from './wizard/steps/DetailsStep'
import PhotosStep, { type ImageRow } from './wizard/steps/PhotosStep'
import AmenitiesStep, { type AmenityItem } from './wizard/steps/AmenitiesStep'
import PricingStep from './wizard/steps/PricingStep'
import ProfitPlanStep from './wizard/steps/ProfitPlanStep'
import DeliveryStep from './wizard/steps/DeliveryStep'
import AddOnsStep from './wizard/steps/AddOnsStep'
import PoliciesStep from './wizard/steps/PoliciesStep'
import CalendarStep from './wizard/steps/CalendarStep'
import ReviewStep from './wizard/steps/ReviewStep'

// ─── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Vehicle',     desc: 'Specs, class, compliance docs' },
  { label: 'Details',     desc: 'Listing narrative, FAQs, included items' },
  { label: 'Photos',      desc: 'Photos that tell your story + video tour' },
  { label: 'Amenities',   desc: "What's included in your van" },
  { label: 'Pricing',     desc: 'Rates, fees & discount tiers' },
  { label: 'Profit plan', desc: 'Rules for nightly rates, stays & discounts' },
  { label: 'Delivery',    desc: 'Vehicle usage, delivery charges & range' },
  { label: 'Add-ons',     desc: 'Optional extras guests can purchase' },
  { label: 'Policies',    desc: 'Trip times, booking settings & house rules' },
  { label: 'Calendar',    desc: 'Block dates & booking constraints' },
  { label: 'Review',      desc: 'Review everything & go live' },
]

type BlockRow = { id: string; start_date: string; end_date: string; block_type: string }

// ─── Main component ───────────────────────────────────────────────────────────

export default function HostListingWizard({
  listingId,
  initial,
}: {
  listingId: string
  initial: Record<string, unknown>
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)

  // ── Step 0: Vehicle ────────────────────────────────────────────────────────
  const [vehicleClass, setVehicleClass] = useState(String(initial.vehicle_class ?? 'Class B / Campervan'))
  const [vehicleYear, setVehicleYear] = useState<number | ''>(
    initial.vehicle_year != null ? Number(initial.vehicle_year) : ''
  )
  const [vehicleMake, setVehicleMake] = useState(String(initial.vehicle_make ?? ''))
  const [vehicleModel, setVehicleModel] = useState(String(initial.vehicle_model ?? ''))
  const [vin, setVin] = useState(String(initial.vin ?? ''))
  const [licensePlate, setLicensePlate] = useState(String(initial.license_plate ?? ''))
  const [registrationDocUrl, setRegistrationDocUrl] = useState(String(initial.registration_doc_url ?? ''))
  const [insuranceDocUrl, setInsuranceDocUrl] = useState(String(initial.insurance_doc_url ?? ''))
  const [lengthLabel, setLengthLabel] = useState(String(initial.length_label ?? ''))
  const [sleeps, setSleeps] = useState(Number(initial.sleeps ?? 2))
  const [seatbelts, setSeatbelts] = useState<number | ''>(
    initial.seatbelts != null ? Number(initial.seatbelts) : ''
  )
  const [category, setCategory] = useState<Van['category']>(
    (initial.category as Van['category']) || 'classic'
  )

  // ── Step 1: Details ───────────────────────────────────────────────────────
  const [title, setTitle] = useState(String(initial.title ?? ''))
  const [tagline, setTagline] = useState(String(initial.tagline ?? ''))
  const [description, setDescription] = useState(String(initial.description ?? ''))
  const [whatsIncluded, setWhatsIncluded] = useState(String(initial.whats_included ?? ''))
  const [faqs, setFaqs] = useState<FAQ[]>(() => {
    const raw = initial.listing_faqs
    return Array.isArray(raw) ? (raw as FAQ[]) : []
  })
  const [tripRecommendations, setTripRecommendations] = useState(String(initial.trip_recommendations ?? ''))
  const [otherThingsNote, setOtherThingsNote] = useState(String(initial.other_things_note ?? ''))

  // ── Step 2: Photos ────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageRow[]>(
    ((initial.listing_images as ImageRow[] | undefined) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    )
  )
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState(String(initial.youtube_video_url ?? ''))

  // ── Step 3: Amenities ─────────────────────────────────────────────────────
  const [amenities, setAmenities] = useState<AmenityItem[]>(() => {
    const a = initial.amenities
    return Array.isArray(a) ? (a as AmenityItem[]) : []
  })

  // ── Step 4: Pricing ───────────────────────────────────────────────────────
  const [pricePerNight, setPricePerNight] = useState(
    Math.round(Number(initial.price_per_night_cents ?? 19900) / 100)
  )
  const [weeklyRate, setWeeklyRate] = useState<number | ''>(
    initial.weekly_rate_cents != null ? Math.round(Number(initial.weekly_rate_cents) / 100) : ''
  )
  const [monthlyRate, setMonthlyRate] = useState<number | ''>(
    initial.monthly_rate_cents != null ? Math.round(Number(initial.monthly_rate_cents) / 100) : ''
  )
  const [securityDeposit, setSecurityDeposit] = useState(
    Math.round(Number(initial.security_deposit_cents ?? 100000) / 100)
  )
  const [cleaning, setCleaning] = useState(
    Math.round(Number(initial.cleaning_fee_cents ?? 15000) / 100)
  )
  const [insurance, setInsurance] = useState(
    Math.round(Number(initial.insurance_fee_cents ?? 7500) / 100)
  )
  const [mileageFee, setMileageFee] = useState(
    Math.round(Number(initial.mileage_fee_cents ?? 0) / 100)
  )
  const [generatorFee, setGeneratorFee] = useState(
    Math.round(Number(initial.generator_fee_cents ?? 0) / 100)
  )
  const [minNights, setMinNights] = useState(Number(initial.min_nights ?? 1))

  // ── Step 5: Profit plan ───────────────────────────────────────────────────
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(() => {
    const raw = initial.pricing_rules
    return Array.isArray(raw) ? (raw as PricingRule[]) : []
  })

  // ── Step 6: Delivery ──────────────────────────────────────────────────────
  const [locationLabel, setLocationLabel] = useState(String(initial.location_label ?? ''))
  const [addressStreet, setAddressStreet] = useState(String(initial.address_street ?? ''))
  const [addressCity, setAddressCity] = useState(String(initial.address_city ?? ''))
  const [addressState, setAddressState] = useState(String(initial.address_state ?? ''))
  const [addressZip, setAddressZip] = useState(String(initial.address_zip ?? ''))
  const [addressCountry, setAddressCountry] = useState(String(initial.address_country ?? 'US'))
  const [deliveryOffered, setDeliveryOffered] = useState(Boolean(initial.delivery_offered))
  const [deliveryRadiusMiles, setDeliveryRadiusMiles] = useState<number | ''>(
    initial.delivery_radius_miles != null ? Number(initial.delivery_radius_miles) : ''
  )
  const [deliveryFeeCents, setDeliveryFeeCents] = useState<number | ''>(
    initial.delivery_fee_cents != null ? Number(initial.delivery_fee_cents) : 0
  )
  const [deliveryPerMileCents, setDeliveryPerMileCents] = useState(
    Number(initial.delivery_per_mile_cents ?? 0)
  )
  const [allowGuestDriving, setAllowGuestDriving] = useState(
    (initial.rules as Record<string, unknown> | undefined)?.allowGuestDriving !== false
  )
  const [oneWayOk, setOneWayOk] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.oneWayOk)
  )

  // ── Step 7: Add-ons ───────────────────────────────────────────────────────
  const [addOns, setAddOns] = useState<AddOn[]>(() => {
    const a = initial.add_ons
    return Array.isArray(a) ? (a as AddOn[]) : []
  })

  // ── Step 8: Policies ──────────────────────────────────────────────────────
  const [petsAllowed, setPetsAllowed] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.petsAllowed)
  )
  const [smokingAllowed, setSmokingAllowed] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.smokingAllowed)
  )
  const [festivalsOk, setFestivalsOk] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.festivalsOk)
  )
  const [minAge, setMinAge] = useState(
    Number((initial.rules as Record<string, unknown> | undefined)?.minDriverAge ?? 25)
  )
  const [customRules, setCustomRules] = useState(
    String((initial.rules as Record<string, unknown> | undefined)?.customRules ?? '')
  )
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>(
    (initial.cancellation_policy as CancellationPolicy) || 'moderate'
  )
  const [pickupTime, setPickupTime] = useState(
    String((initial.rules as Record<string, unknown> | undefined)?.tripPickupTime ?? '11:00')
  )
  const [returnTime, setReturnTime] = useState(
    String((initial.rules as Record<string, unknown> | undefined)?.tripReturnTime ?? '15:00')
  )
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(
    Number((initial.rules as Record<string, unknown> | undefined)?.advanceNoticeDays ?? initial.lead_time_days ?? 1)
  )
  const [turnaroundSameDayPickup, setTurnaroundSameDayPickup] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.turnaroundSameDayPickup)
  )
  const [instantBook, setInstantBook] = useState(
    Boolean((initial.rules as Record<string, unknown> | undefined)?.instantBook)
  )

  // ── Step 9: Calendar ──────────────────────────────────────────────────────
  const [maxNights, setMaxNights] = useState<number | ''>(
    initial.max_nights != null ? Number(initial.max_nights) : ''
  )
  const [leadTimeDays, setLeadTimeDays] = useState(Number(initial.lead_time_days ?? 1))
  const [bufferDays, setBufferDays] = useState(Number(initial.buffer_days ?? 0))

  const calendarBlocks: BlockRange[] = useMemo(() => {
    const raw = (initial.availability_blocks as BlockRow[] | undefined) ?? []
    return raw.map((b) => ({
      start: b.start_date,
      end: b.end_date,
      type: b.block_type as BlockRange['type'],
    }))
  }, [initial.availability_blocks])

  const hostBlocks = useMemo(
    () =>
      ((initial.availability_blocks as BlockRow[]) ?? []).filter(
        (b) => b.block_type === 'host_blocked'
      ),
    [initial.availability_blocks]
  )

  // ─── Persist all core fields ───────────────────────────────────────────────

  const persistCore = () =>
    updateListing({
      id: listingId,
      // Vehicle
      title,
      tagline,
      description,
      vehicle_class: vehicleClass,
      vehicle_year: vehicleYear === '' ? null : vehicleYear,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vin: vin || null,
      license_plate: licensePlate || null,
      registration_doc_url: registrationDocUrl || null,
      insurance_doc_url: insuranceDocUrl || null,
      length_label: lengthLabel,
      sleeps,
      seatbelts: seatbelts === '' ? null : seatbelts,
      category,
      // Details
      whats_included: whatsIncluded || null,
      listing_faqs: faqs,
      trip_recommendations: tripRecommendations || null,
      other_things_note: otherThingsNote || null,
      // Photos
      youtube_video_url: youtubeVideoUrl || null,
      // Location
      location_label: locationLabel,
      address_street: addressStreet || null,
      address_city: addressCity || null,
      address_state: addressState || null,
      address_zip: addressZip || null,
      address_country: addressCountry,
      // Delivery
      delivery_offered: deliveryOffered,
      delivery_radius_miles: deliveryRadiusMiles === '' ? null : deliveryRadiusMiles,
      delivery_fee_cents: deliveryFeeCents === '' ? 0 : deliveryFeeCents,
      delivery_per_mile_cents: deliveryPerMileCents,
      // Pricing
      price_per_night_cents: pricePerNight * 100,
      weekly_rate_cents: weeklyRate === '' ? null : weeklyRate * 100,
      monthly_rate_cents: monthlyRate === '' ? null : monthlyRate * 100,
      security_deposit_cents: securityDeposit * 100,
      cleaning_fee_cents: cleaning * 100,
      insurance_fee_cents: insurance * 100,
      mileage_fee_cents: mileageFee * 100,
      generator_fee_cents: generatorFee * 100,
      min_nights: minNights,
      max_nights: maxNights === '' ? null : maxNights,
      // Profit plan
      pricing_rules: pricingRules,
      // Amenities
      amenities,
      // Add-ons
      add_ons: addOns,
      // Rules / policies
      rules: {
        petsAllowed,
        smokingAllowed,
        festivalsOk,
        oneWayOk,
        allowGuestDriving,
        minDriverAge: minAge,
        customRules: customRules || undefined,
        tripPickupTime: pickupTime,
        tripReturnTime: returnTime,
        advanceNoticeDays,
        turnaroundSameDayPickup,
        instantBook,
      },
      cancellation_policy: cancellationPolicy,
      // Calendar
      lead_time_days: leadTimeDays,
      buffer_days: bufferDays,
    })

  // ─── Navigation ────────────────────────────────────────────────────────────

  const onNext = () => {
    startTransition(async () => {
      setMessage(null)
      const r = await persistCore()
      if (!r.ok) { setMessage(r.error ?? 'Save failed'); return }
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
      router.refresh()
    })
  }

  const onBack = () => setStep((s) => Math.max(0, s - 1))

  const listingSlug = String(initial.slug ?? '')
  const listingStatus = String(initial.status ?? 'draft')
  const isPublished = listingStatus === 'published'

  const saveOnly = async () => {
    const r = await persistCore()
    if (!r.ok) return r
    router.refresh()
    return r
  }

  const onTabSelect = (index: number) => {
    if (index === step) return
    startTransition(async () => {
      setMessage(null)
      const r = await persistCore()
      if (!r.ok) { setMessage(r.error ?? 'Save failed'); return }
      setStep(index)
      router.refresh()
    })
  }

  const onPublish = () => {
    startTransition(async () => {
      setMessage(null)
      const rSave = await persistCore()
      if (!rSave.ok) { setMessage(rSave.error ?? 'Save failed'); return }
      const r = await publishListing(listingId, title || 'Listing')
      if (!r.ok) { setMessage(r.error ?? 'Publish failed'); return }
      router.push('/host')
      router.refresh()
    })
  }

  // ─── Image helpers ─────────────────────────────────────────────────────────

  const onUploadImage = async (file: File) => {
    if (!isSupabaseConfigured()) { setMessage('Supabase not configured'); return }
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${(await supabase.auth.getUser()).data.user?.id}/${listingId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('listing-images').upload(path, file, {
      upsert: false,
      contentType: file.type,
    })
    if (error) { setMessage(error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
    const sortOrder = images.length
    const res = await saveListingImage(listingId, publicUrl, sortOrder)
    if (!res.ok) { setMessage(res.error ?? 'Could not save image'); return }
    setImages((prev) => [...prev, { id: crypto.randomUUID(), url: publicUrl, sort_order: sortOrder }])
    router.refresh()
  }

  const onDeleteImage = async (img: ImageRow) => {
    const r = await deleteListingImage(img.id, listingId)
    if (!r.ok) { setMessage(r.error ?? 'Delete failed'); return }
    setImages((prev) => prev.filter((i) => i.id !== img.id))
  }

  const onReorderImages = async (orderedIds: string[]) => {
    const r = await reorderListingImages(listingId, orderedIds)
    if (!r.ok) { setMessage(r.error ?? 'Reorder failed'); return }
    setImages((prev) => {
      const byId = Object.fromEntries(prev.map((i) => [i.id, i]))
      return orderedIds.map((id, idx) => ({ ...byId[id], sort_order: idx }))
    })
  }

  // ─── Doc upload ────────────────────────────────────────────────────────────

  const onUploadDoc = async (file: File, docType: 'registration' | 'insurance') => {
    if (!isSupabaseConfigured()) { setMessage('Supabase not configured'); return }
    setUploadingDoc(docType)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'pdf'
    const userId = (await supabase.auth.getUser()).data.user?.id
    const path = `${userId}/${listingId}/docs/${docType}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('listing-images').upload(path, file, {
      upsert: false,
      contentType: file.type,
    })
    if (error) { setMessage(error.message); setUploadingDoc(null); return }
    const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
    if (docType === 'registration') setRegistrationDocUrl(publicUrl)
    else setInsuranceDocUrl(publicUrl)
    setUploadingDoc(null)
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const coverThumb =
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null

  const locationLine =
    locationLabel ||
    [addressCity, addressState].filter(Boolean).join(', ') ||
    'Location not set'

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 sm:pt-8">
      <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">

        {/* Listing header */}
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/host/listings"
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Back to listings"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                {coverThumb ? (
                  <Image src={coverThumb} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="line-clamp-2 text-base font-bold leading-snug text-neutral-900 sm:text-lg">
                  {title || 'Untitled listing'}
                </h1>
                <p className="mt-0.5 text-sm text-neutral-500">{locationLine}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-12 sm:shrink-0 sm:pl-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                {isPublished ? (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    Published
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                    <span className="capitalize">{listingStatus}</span>
                  </>
                )}
              </div>
              {isPublished && listingSlug ? (
                <Link
                  href={`/listings/${listingSlug}`}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-neutral-900 px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  View listing
                </Link>
              ) : null}
            </div>
          </div>

          {/* Tab bar */}
          <nav
            className="mt-4 flex flex-wrap gap-x-0 gap-y-0 border-t border-neutral-200 pt-3 -mb-px pb-px"
            aria-label="Listing sections"
          >
            {STEPS.map((s, i) => {
              const active = i === step
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onTabSelect(i)}
                  disabled={pending}
                  className={[
                    'border-b-2 px-2.5 py-2.5 text-sm transition sm:px-3.5',
                    active
                      ? 'border-neutral-900 font-semibold text-neutral-900'
                      : 'border-transparent font-medium text-neutral-400 hover:text-neutral-600',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="bg-neutral-50/50 px-4 py-6 sm:px-6">
          <p className="mb-5 text-xs text-neutral-500">{STEPS[step].desc}</p>

          {message && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          )}

          {step === 0 && (
            <VehicleStep
              vehicleClass={vehicleClass} setVehicleClass={setVehicleClass}
              vehicleYear={vehicleYear} setVehicleYear={setVehicleYear}
              vehicleMake={vehicleMake} setVehicleMake={setVehicleMake}
              vehicleModel={vehicleModel} setVehicleModel={setVehicleModel}
              lengthLabel={lengthLabel} setLengthLabel={setLengthLabel}
              sleeps={sleeps} setSleeps={setSleeps}
              seatbelts={seatbelts} setSeatbelts={setSeatbelts}
              category={category} setCategory={setCategory}
              vin={vin} setVin={setVin}
              licensePlate={licensePlate} setLicensePlate={setLicensePlate}
              registrationDocUrl={registrationDocUrl} setRegistrationDocUrl={setRegistrationDocUrl}
              insuranceDocUrl={insuranceDocUrl} setInsuranceDocUrl={setInsuranceDocUrl}
              uploadingDoc={uploadingDoc}
              onUploadDoc={onUploadDoc}
            />
          )}

          {step === 1 && (
            <DetailsStep
              title={title} setTitle={setTitle}
              tagline={tagline} setTagline={setTagline}
              description={description} setDescription={setDescription}
              whatsIncluded={whatsIncluded} setWhatsIncluded={setWhatsIncluded}
              faqs={faqs} setFaqs={setFaqs}
              tripRecommendations={tripRecommendations} setTripRecommendations={setTripRecommendations}
              otherThingsNote={otherThingsNote} setOtherThingsNote={setOtherThingsNote}
            />
          )}

          {step === 2 && (
            <PhotosStep
              images={images}
              onUploadImage={onUploadImage}
              onDeleteImage={onDeleteImage}
              onReorderImages={onReorderImages}
              youtubeVideoUrl={youtubeVideoUrl}
              setYoutubeVideoUrl={setYoutubeVideoUrl}
            />
          )}

          {step === 3 && (
            <AmenitiesStep
              amenities={amenities}
              setAmenities={setAmenities}
            />
          )}

          {step === 4 && (
            <PricingStep
              pricePerNight={pricePerNight} setPricePerNight={setPricePerNight}
              weeklyRate={weeklyRate} setWeeklyRate={setWeeklyRate}
              monthlyRate={monthlyRate} setMonthlyRate={setMonthlyRate}
              securityDeposit={securityDeposit} setSecurityDeposit={setSecurityDeposit}
              cleaning={cleaning} setCleaning={setCleaning}
              insurance={insurance} setInsurance={setInsurance}
              mileageFee={mileageFee} setMileageFee={setMileageFee}
              generatorFee={generatorFee} setGeneratorFee={setGeneratorFee}
              minNights={minNights} setMinNights={setMinNights}
            />
          )}

          {step === 5 && (
            <ProfitPlanStep
              rules={pricingRules}
              setRules={setPricingRules}
              defaultMinNights={minNights}
            />
          )}

          {step === 6 && (
            <DeliveryStep
              deliveryOffered={deliveryOffered} setDeliveryOffered={setDeliveryOffered}
              deliveryRadiusMiles={deliveryRadiusMiles} setDeliveryRadiusMiles={setDeliveryRadiusMiles}
              deliveryFeeCents={deliveryFeeCents} setDeliveryFeeCents={setDeliveryFeeCents}
              deliveryPerMileCents={deliveryPerMileCents} setDeliveryPerMileCents={setDeliveryPerMileCents}
              allowGuestDriving={allowGuestDriving} setAllowGuestDriving={setAllowGuestDriving}
              oneWayOk={oneWayOk} setOneWayOk={setOneWayOk}
              addressStreet={addressStreet}
              addressCity={addressCity}
              addressState={addressState}
              addressZip={addressZip}
            />
          )}

          {step === 7 && (
            <AddOnsStep addOns={addOns} setAddOns={setAddOns} />
          )}

          {step === 8 && (
            <PoliciesStep
              cancellationPolicy={cancellationPolicy} setCancellationPolicy={setCancellationPolicy}
              petsAllowed={petsAllowed} setPetsAllowed={setPetsAllowed}
              smokingAllowed={smokingAllowed} setSmokingAllowed={setSmokingAllowed}
              festivalsOk={festivalsOk} setFestivalsOk={setFestivalsOk}
              minAge={minAge} setMinAge={setMinAge}
              customRules={customRules} setCustomRules={setCustomRules}
              pickupTime={pickupTime} setPickupTime={setPickupTime}
              returnTime={returnTime} setReturnTime={setReturnTime}
              advanceNoticeDays={advanceNoticeDays} setAdvanceNoticeDays={setAdvanceNoticeDays}
              turnaroundSameDayPickup={turnaroundSameDayPickup} setTurnaroundSameDayPickup={setTurnaroundSameDayPickup}
              instantBook={instantBook} setInstantBook={setInstantBook}
            />
          )}

          {step === 9 && (
            <CalendarStep
              calendarBlocks={calendarBlocks}
              hostBlocks={hostBlocks}
              maxNights={maxNights} setMaxNights={setMaxNights}
              leadTimeDays={leadTimeDays} setLeadTimeDays={setLeadTimeDays}
              bufferDays={bufferDays} setBufferDays={setBufferDays}
              onAddBlock={async (start, end) => {
                const r = await addHostAvailabilityBlock(listingId, start, end)
                if (!r.ok) setMessage(r.error ?? 'Could not add block')
                else router.refresh()
              }}
              onRemoveBlock={async (id) => {
                const r = await removeHostAvailabilityBlock(id, listingId)
                if (!r.ok) setMessage(r.error ?? 'Remove failed')
                else router.refresh()
              }}
            />
          )}

          {step === 10 && (
            <ReviewStep
              listingId={listingId}
              title={title}
              vehicleYear={vehicleYear}
              vehicleMake={vehicleMake}
              vehicleModel={vehicleModel}
              vehicleClass={vehicleClass}
              vin={vin}
              licensePlate={licensePlate}
              locationLabel={locationLabel}
              addressCity={addressCity}
              addressState={addressState}
              category={category}
              sleeps={sleeps}
              pricePerNight={pricePerNight}
              weeklyRate={weeklyRate}
              monthlyRate={monthlyRate}
              securityDeposit={securityDeposit}
              cancellationPolicy={cancellationPolicy}
              amenities={amenities}
              addOns={addOns}
              images={images}
              registrationDocUrl={registrationDocUrl}
              insuranceDocUrl={insuranceDocUrl}
              pending={pending}
              onPublish={onPublish}
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button
            type="button"
            disabled={step === 0 || pending}
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setMessage(null)
                  const r = await saveOnly()
                  if (!r.ok) setMessage(r.error ?? 'Save failed')
                })
              }
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-900 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save changes
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                disabled={pending}
                onClick={onNext}
                className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-6 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
