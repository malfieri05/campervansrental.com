'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  updateProfile,
  updateAvatarUrl,
  startStripeConnectOnboarding,
  type ProfileFields,
} from './actions'

// ─── Small UI helpers ────────────────────────────────────────────────────────

function Field({
  label,
  id,
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/20 disabled:bg-neutral-50 disabled:text-neutral-500"
      />
    </div>
  )
}

function TextArea({
  label,
  id,
  value,
  onChange,
  disabled,
  placeholder,
  rows = 4,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/20 disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
      />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

type Props = {
  initialProfile: ProfileFields | null
  userId: string
  supabaseUrl: string
  isHost: boolean
  stripeCustomerId: string | null
  stripeConnectAccountId: string | null
  /** When false, hide host “Connect Stripe” (platform Stripe has no Connect yet). */
  stripeHostConnectOffered: boolean
}

export default function AccountPageClient({
  initialProfile,
  userId,
  supabaseUrl,
  isHost,
  stripeCustomerId,
  stripeConnectAccountId,
  stripeHostConnectOffered,
}: Props) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'payments' ? 'payments' : 'profile'
  const [form, setForm] = useState<ProfileFields>({
    first_name: initialProfile?.first_name ?? '',
    last_name: initialProfile?.last_name ?? '',
    phone: initialProfile?.phone ?? '',
    about_me: initialProfile?.about_me ?? '',
    address_street: initialProfile?.address_street ?? '',
    address_city: initialProfile?.address_city ?? '',
    address_state: initialProfile?.address_state ?? '',
    address_zip: initialProfile?.address_zip ?? '',
    address_country: initialProfile?.address_country ?? 'US',
    avatar_url: initialProfile?.avatar_url ?? '',
    display_name: initialProfile?.display_name ?? '',
  })

  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'profile' | 'payments'>(initialTab)
  const [isConnectingStripe, setIsConnectingStripe] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffsetX, setCropOffsetX] = useState(0)
  const [cropOffsetY, setCropOffsetY] = useState(0)
  const [cropNaturalSize, setCropNaturalSize] = useState({ width: 1, height: 1 })
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof ProfileFields) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    setStatus(null)
    startTransition(async () => {
      const result = await updateProfile(form)
      if (result.error) {
        setStatus({ type: 'error', message: result.error })
      } else {
        setStatus({ type: 'success', message: 'Profile saved successfully.' })
        setEditing(false)
      }
    })
  }

  const handleCancel = () => {
    setForm({
      first_name: initialProfile?.first_name ?? '',
      last_name: initialProfile?.last_name ?? '',
      phone: initialProfile?.phone ?? '',
      about_me: initialProfile?.about_me ?? '',
      address_street: initialProfile?.address_street ?? '',
      address_city: initialProfile?.address_city ?? '',
      address_state: initialProfile?.address_state ?? '',
      address_zip: initialProfile?.address_zip ?? '',
      address_country: initialProfile?.address_country ?? 'US',
      avatar_url: initialProfile?.avatar_url ?? '',
      display_name: initialProfile?.display_name ?? '',
    })
    setStatus(null)
    setEditing(false)
  }

  const uploadAvatarBlob = async (blob: Blob) => {
    setAvatarUploading(true)
    setStatus(null)

    try {
      const supabase = createClient()
      const path = `${userId}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw new Error(uploadError.message)

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/profile-images/${path}`

      const result = await updateAvatarUrl(publicUrl)
      if (result.error) throw new Error(result.error)

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }))
      setStatus({ type: 'success', message: 'Profile photo updated.' })
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (!src) return
      const img = new window.Image()
      img.onload = () => {
        setCropNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
        setCropImageSrc(src)
        setCropZoom(1)
        setCropOffsetX(0)
        setCropOffsetY(0)
        setCropModalOpen(true)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const handleCropAndUpload = async () => {
    if (!cropImageSrc) return

    const img = new window.Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load image for cropping.'))
      img.src = cropImageSrc
    })

    const outputSize = 512
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setStatus({ type: 'error', message: 'Could not initialize image editor.' })
      return
    }

    const baseScale = Math.max(outputSize / img.naturalWidth, outputSize / img.naturalHeight)
    const drawScale = baseScale * cropZoom
    const drawWidth = img.naturalWidth * drawScale
    const drawHeight = img.naturalHeight * drawScale

    const maxOffsetX = Math.max(0, (drawWidth - outputSize) / 2)
    const maxOffsetY = Math.max(0, (drawHeight - outputSize) / 2)
    const drawX = (outputSize - drawWidth) / 2 - (cropOffsetX / 100) * maxOffsetX
    const drawY = (outputSize - drawHeight) / 2 - (cropOffsetY / 100) * maxOffsetY

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputSize, outputSize)
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9)
    })

    if (!blob) {
      setStatus({ type: 'error', message: 'Could not prepare cropped image.' })
      return
    }

    setCropModalOpen(false)
    await uploadAvatarBlob(blob)
  }

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true)
    setStatus(null)
    try {
      const result = await startStripeConnectOnboarding()
      if (result.error || !result.url) {
        setStatus({
          type: 'error',
          message: result.error ?? 'Could not start Stripe onboarding.',
        })
        return
      }
      window.location.href = result.url
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to start Stripe onboarding right now.',
      })
    } finally {
      setIsConnectingStripe(false)
    }
  }

  const cropPreviewSize = 256
  const previewBaseScale = Math.max(
    cropPreviewSize / cropNaturalSize.width,
    cropPreviewSize / cropNaturalSize.height
  )
  const previewDrawScale = previewBaseScale * cropZoom
  const previewDrawWidth = cropNaturalSize.width * previewDrawScale
  const previewDrawHeight = cropNaturalSize.height * previewDrawScale
  const previewMaxOffsetX = Math.max(0, (previewDrawWidth - cropPreviewSize) / 2)
  const previewMaxOffsetY = Math.max(0, (previewDrawHeight - cropPreviewSize) / 2)

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))

  const beginCropDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (avatarUploading) return
    setIsDraggingCrop(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: cropOffsetX,
      panY: cropOffsetY,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveCropDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    const nextPanX =
      previewMaxOffsetX > 0
        ? clamp(dragStartRef.current.panX - (deltaX / previewMaxOffsetX) * 100, -100, 100)
        : 0
    const nextPanY =
      previewMaxOffsetY > 0
        ? clamp(dragStartRef.current.panY - (deltaY / previewMaxOffsetY) * 100, -100, 100)
        : 0

    setCropOffsetX(nextPanX)
    setCropOffsetY(nextPanY)
  }

  const endCropDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop) return
    setIsDraggingCrop(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // no-op
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Page header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-2xl font-bold text-forest-950 uppercase tracking-wider">
            Account
          </h1>
          {/* Tab row */}
          <nav className="mt-6 flex gap-8 border-b border-neutral-200 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={[
                'pb-3 font-display text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors',
                activeTab === 'profile'
                  ? 'border-forest-950 text-forest-950'
                  : 'border-transparent text-neutral-500 hover:text-forest-900',
              ].join(' ')}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={[
                'pb-3 font-display text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors',
                activeTab === 'payments'
                  ? 'border-forest-950 text-forest-950'
                  : 'border-transparent text-neutral-500 hover:text-forest-900',
              ].join(' ')}
            >
              Payments & Payouts
            </button>
          </nav>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {status && (
          <div
            className={[
              'mb-6 rounded-lg px-4 py-3 text-sm font-medium',
              status.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200',
            ].join(' ')}
          >
            {status.message}
          </div>
        )}

        {activeTab === 'profile' ? (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">

          {/* Left — photo panel */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group relative h-36 w-36 overflow-hidden rounded-full ring-2 ring-forest-950/10 transition hover:ring-forest-700/40 disabled:cursor-not-allowed"
              aria-label="Upload profile photo"
            >
              {form.avatar_url ? (
                <Image
                  src={form.avatar_url}
                  alt="Profile photo"
                  width={140}
                  height={140}
                  className="h-36 w-36 object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-neutral-500">
                  <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" aria-hidden>
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-2 opacity-100 transition group-hover:bg-black/65">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden>
                  <path d="M8.5 7.5 10 5.7A1.5 1.5 0 0 1 11.2 5h1.6a1.5 1.5 0 0 1 1.2.7l1.5 1.8H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2.5Z" stroke="currentColor" strokeWidth="1.7" />
                  <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              </div>

              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="text-center text-xs text-neutral-400">
              JPG, PNG or GIF · Max 5 MB
            </p>
          </div>

            {/* Right — form */}
            <div className="space-y-8">

            {/* Personal info */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-forest-950">
                  Personal Information
                </h2>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-display text-xs font-semibold uppercase tracking-wider text-forest-700 hover:text-forest-950 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" id="first_name" value={form.first_name} onChange={set('first_name')} disabled={!editing} placeholder="Jane" />
                <Field label="Last name" id="last_name" value={form.last_name} onChange={set('last_name')} disabled={!editing} placeholder="Smith" />
                <Field label="Phone number" id="phone" value={form.phone} onChange={set('phone')} disabled={!editing} type="tel" placeholder="+1 (555) 000-0000" />
              </div>

              <div className="mt-4">
                <TextArea
                  label="About me"
                  id="about_me"
                  value={form.about_me}
                  onChange={set('about_me')}
                  disabled={!editing}
                  placeholder="Tell other members a little about yourself…"
                  rows={4}
                />
              </div>
            </section>

            {/* Address */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-forest-950 mb-5">
                Address
              </h2>

              <div className="grid gap-4">
                <Field label="Street address" id="address_street" value={form.address_street} onChange={set('address_street')} disabled={!editing} placeholder="123 Adventure Lane" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="City" id="address_city" value={form.address_city} onChange={set('address_city')} disabled={!editing} placeholder="Portland" />
                  <Field label="State / Region" id="address_state" value={form.address_state} onChange={set('address_state')} disabled={!editing} placeholder="OR" />
                  <Field label="ZIP / Postal code" id="address_zip" value={form.address_zip} onChange={set('address_zip')} disabled={!editing} placeholder="97201" />
                </div>
                <Field label="Country" id="address_country" value={form.address_country} onChange={set('address_country')} disabled={!editing} placeholder="US" />
              </div>
            </section>

            {/* Action buttons */}
            {editing && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-lg bg-forest-900 px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-cream-100 transition hover:bg-forest-700 disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="rounded-lg border border-neutral-300 px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}

            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-forest-950">
                    Payment methods
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Manage how you pay for bookings as a traveler.
                  </p>
                </div>
                <span
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
                    stripeCustomerId
                      ? 'bg-green-100 text-green-800'
                      : 'bg-neutral-100 text-neutral-600',
                  ].join(' ')}
                >
                  {stripeCustomerId ? 'Customer profile ready' : 'Not set up yet'}
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                Cards are added securely during checkout and reused for future trips.
              </p>
            </section>

            {isHost && (
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-forest-950">
                      Host payout methods
                    </h2>
                    <p className="mt-2 text-sm text-neutral-600">
                      Connect Stripe to receive payouts from completed bookings.
                    </p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
                      stripeConnectAccountId
                        ? 'bg-green-100 text-green-800'
                        : stripeHostConnectOffered
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-600',
                    ].join(' ')}
                  >
                    {stripeConnectAccountId
                      ? 'Stripe connected'
                      : stripeHostConnectOffered
                        ? 'Action needed'
                        : 'Connect off'}
                  </span>
                </div>

                {stripeConnectAccountId ? (
                  <p className="mt-4 text-sm text-neutral-500">
                    Your Stripe payout account is connected. You are ready to receive host payouts.
                  </p>
                ) : !stripeHostConnectOffered ? (
                  <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">Host Connect is off for this deployment</p>
                    <p className="mt-2 leading-relaxed">
                      Set <code className="rounded bg-white px-1.5 py-0.5 text-xs">NEXT_PUBLIC_STRIPE_HOST_CONNECT=true</code> after your{' '}
                      <strong>platform</strong> Stripe account (the one behind <code className="rounded bg-white px-1.5 py-0.5 text-xs">STRIPE_SECRET_KEY</code>) has Connect enabled. Until then, guest reservation fees still work via normal Checkout.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleConnectStripe()}
                      disabled={isConnectingStripe}
                      className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-forest-700 disabled:opacity-50"
                    >
                      {isConnectingStripe ? 'Connecting…' : 'Connect Stripe'}
                    </button>
                    <p className="text-sm text-neutral-500">
                      Once connected, payouts will be sent to your Stripe account.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {cropModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-forest-950">
              Adjust profile photo
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Drag the photo to frame it, then save.
            </p>

            <div className="mt-5 flex justify-center">
              <div
                className={[
                  'relative h-64 w-64 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 select-none touch-none',
                  isDraggingCrop ? 'cursor-grabbing' : 'cursor-grab',
                ].join(' ')}
                onPointerDown={beginCropDrag}
                onPointerMove={moveCropDrag}
                onPointerUp={endCropDrag}
                onPointerCancel={endCropDrag}
              >
                {cropImageSrc ? (
                  <img
                    src={cropImageSrc}
                    alt="Crop preview"
                    className="absolute max-w-none select-none"
                    style={{
                      width: `${previewDrawWidth}px`,
                      height: `${previewDrawHeight}px`,
                      left: `${(cropPreviewSize - previewDrawWidth) / 2 - (cropOffsetX / 100) * previewMaxOffsetX}px`,
                      top: `${(cropPreviewSize - previewDrawHeight) / 2 - (cropOffsetY / 100) * previewMaxOffsetY}px`,
                    }}
                    draggable={false}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Zoom
                </label>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.01}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCropModalOpen(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCropAndUpload()}
                className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-forest-700"
              >
                Save photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
