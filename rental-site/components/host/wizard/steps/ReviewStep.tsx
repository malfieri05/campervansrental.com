'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, ReviewRow } from '../formPrimitives'
import { deleteListing } from '@/app/host/listings/actions'

interface ReviewStepProps {
  listingId: string
  title: string
  vehicleYear: number | ''
  vehicleMake: string
  vehicleModel: string
  vehicleClass: string
  vin: string
  licensePlate: string
  locationLabel: string
  addressCity: string
  addressState: string
  category: string
  sleeps: number
  pricePerNight: number
  weeklyRate: number | ''
  monthlyRate: number | ''
  securityDeposit: number
  cancellationPolicy: string
  amenities: { label: string }[]
  addOns: { name: string }[]
  images: { id: string }[]
  registrationDocUrl: string
  insuranceDocUrl: string
  pending: boolean
  onPublish: () => void
}

export default function ReviewStep(p: ReviewStepProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  const vehicleLine = [p.vehicleYear, p.vehicleMake, p.vehicleModel, p.vehicleClass]
    .filter(Boolean)
    .join(' ')
  const locationLine =
    p.locationLabel || [p.addressCity, p.addressState].filter(Boolean).join(', ') || '—'

  const runDelete = () => {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const r = await deleteListing(p.listingId)
      if (!r.ok) {
        setDeleteError(r.error ?? 'Could not delete listing')
        return
      }
      setShowDeleteConfirm(false)
      router.push('/host/listings')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Review your listing</h2>
        <dl className="divide-y divide-neutral-100">
          <ReviewRow label="Title" value={p.title || '—'} />
          <ReviewRow label="Vehicle" value={vehicleLine || '—'} />
          <ReviewRow label="VIN" value={p.vin || '—'} />
          <ReviewRow label="License plate" value={p.licensePlate || '—'} />
          <ReviewRow label="Location" value={locationLine} />
          <ReviewRow label="Category" value={p.category} />
          <ReviewRow label="Sleeps" value={String(p.sleeps)} />
          <ReviewRow label="Nightly rate" value={`$${p.pricePerNight}`} />
          {p.weeklyRate !== '' && <ReviewRow label="Weekly rate" value={`$${p.weeklyRate}`} />}
          {p.monthlyRate !== '' && <ReviewRow label="Monthly rate" value={`$${p.monthlyRate}`} />}
          <ReviewRow label="Security deposit" value={`$${p.securityDeposit}`} />
          <ReviewRow label="Cancellation policy" value={p.cancellationPolicy} />
          <ReviewRow
            label="Amenities"
            value={p.amenities.map((a) => a.label).join(', ') || 'None selected'}
          />
          <ReviewRow
            label="Add-ons"
            value={p.addOns.length > 0 ? p.addOns.map((a) => a.name).join(', ') : 'None'}
          />
          <ReviewRow label="Photos" value={`${p.images.length} uploaded`} />
          <ReviewRow label="Registration doc" value={p.registrationDocUrl ? '✓ Uploaded' : '⚠ Missing'} />
          <ReviewRow label="Insurance doc" value={p.insuranceDocUrl ? '✓ Uploaded' : '⚠ Missing'} />
        </dl>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-neutral-700">
        <strong className="text-neutral-900">Ready to go live?</strong> Your listing will be visible
        on the fleet page once published. You can edit any details at any time from your host
        dashboard.
      </div>

      <button
        type="button"
        disabled={p.pending}
        onClick={p.onPublish}
        className="w-full rounded-full bg-neutral-900 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {p.pending ? 'Publishing…' : 'Publish listing'}
      </button>

      <div className="border-t border-neutral-200 pt-6">
        <p className="text-sm text-neutral-500 mb-3">
          Need to remove this listing entirely? This cannot be undone.
        </p>
        <button
          type="button"
          disabled={p.pending || deletePending}
          onClick={() => {
            setDeleteError(null)
            setShowDeleteConfirm(true)
          }}
          className="text-sm font-semibold text-red-600 underline underline-offset-4 hover:text-red-700 disabled:opacity-50"
        >
          Delete listing
        </button>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => !deletePending && setShowDeleteConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-listing-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-listing-title" className="font-sans text-lg font-bold text-neutral-900">
              Are you sure?
            </h3>
            <p className="mt-3 text-sm text-neutral-600">
              This will permanently delete this listing, including photos and availability. If you
              only want to hide it from guests, you can keep it as a draft instead.
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletePending}
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePending}
                onClick={runDelete}
                className="inline-flex h-10 items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletePending ? 'Deleting…' : 'Yes, delete listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
