'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, FileText, ChevronRight, Check, Upload, X } from 'lucide-react'
import {
  buildAgreementSections,
  AGREEMENT_VERSION,
  type AgreementParams,
} from '@/lib/rental-agreement-template'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripSummary {
  primaryImage: string
  title: string
  slug: string
  category: string
  location: string
  startDate: string
  endDate: string
  guests: number
  nights: number
  tripTotalCents: number
  reservationFeeCents: number
}

interface Props {
  paid: boolean
  tripSummary: TripSummary | null
  stripeSessionId: string
  reservationId: string | null
  /** Present when reservation row was loaded server-side */
  reservationStatus?: string | null
  hostName?: string
  vehicleYear?: string
  vehicleMake?: string
  vehicleModel?: string
  vin?: string
  licensePlate?: string
}

type Step = 'dl' | 'insurance' | 'agreement'

const STEPS: { id: Step; label: string }[] = [
  { id: 'dl',        label: 'Driver License' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'agreement', label: 'Agreement' },
]

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}
function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return s }
}

/** Client-only: rasterize typed name as a script signature (submit fallback if canvas sync lags). */
function typedNameToSignatureDataUrl(text: string): string | null {
  const t = text.trim()
  if (!t || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 90
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const maxW = canvas.width - 40
  let fontSize = 40
  for (; fontSize >= 18; fontSize -= 2) {
    ctx.font = `italic 900 ${fontSize}px "Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive`
    if (ctx.measureText(t).width <= maxW) break
  }
  ctx.font = `italic 900 ${fontSize}px "Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive`
  ctx.fillText(t, cx, cy)
  return canvas.toDataURL('image/png')
}

// ─── Signature canvas (draw and/or typed “script” preview) ────────────────────

function SignatureCanvas({
  onSave,
  typedSignature,
}: {
  onSave: (dataUrl: string | null) => void
  typedSignature: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const typedPreviewActive = useRef(false)
  const typedPropRef = useRef(typedSignature)
  typedPropRef.current = typedSignature

  const [isEmpty, setIsEmpty] = useState(true)

  const paintTypedName = useCallback(
    (text: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      const t = text.trim()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!t) {
        typedPreviewActive.current = false
        setIsEmpty(true)
        onSave(null)
        return
      }
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1a1a1a'
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const maxW = canvas.width - 40
      let fontSize = 40
      for (; fontSize >= 18; fontSize -= 2) {
        ctx.font = `italic 900 ${fontSize}px "Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive`
        if (ctx.measureText(t).width <= maxW) break
      }
      ctx.font = `italic 900 ${fontSize}px "Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive`
      ctx.fillText(t, cx, cy)
      ctx.restore()
      typedPreviewActive.current = true
      setIsEmpty(false)
      onSave(canvas.toDataURL('image/png'))
    },
    [onSave]
  )

  // When the typed name changes, refresh the script preview (unless user is mid-stroke)
  useEffect(() => {
    if (drawing.current) return
    paintTypedName(typedSignature)
  }, [typedSignature, paintTypedName])

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const start = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const ctx = canvas.getContext('2d')!
      if (typedPreviewActive.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        typedPreviewActive.current = false
        setIsEmpty(true)
        onSave(null)
      }
      drawing.current = true
      const { x, y } = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(x, y)
    },
    [onSave]
  )

  const move = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const ctx = canvas.getContext('2d')!
      const { x, y } = getPos(e, canvas)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      setIsEmpty(false)
      onSave(canvas.toDataURL('image/png'))
    },
    [onSave]
  )

  const end = useCallback(() => {
    drawing.current = false
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    typedPreviewActive.current = false
    setIsEmpty(true)
    onSave(null)
    const t = typedPropRef.current.trim()
    if (t) paintTypedName(t)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown', start as EventListener)
    canvas.addEventListener('mousemove', move as EventListener)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start as EventListener, { passive: false })
    canvas.addEventListener('touchmove', move as EventListener, { passive: false })
    canvas.addEventListener('touchend', end)
    return () => {
      canvas.removeEventListener('mousedown', start as EventListener)
      canvas.removeEventListener('mousemove', move as EventListener)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start as EventListener)
      canvas.removeEventListener('touchmove', move as EventListener)
      canvas.removeEventListener('touchend', end)
    }
  }, [start, move, end])

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={90}
        aria-label="Signature — draw here or your typed name appears as a script signature"
        className="w-full border-2 border-charcoal/20 rounded-lg bg-white cursor-crosshair touch-none"
        style={{ maxWidth: '100%' }}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="font-sans text-xs text-charcoal/40">
          Draw in the box above, or type your name below.
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="font-sans text-xs text-charcoal/50 hover:text-charcoal disabled:opacity-30 transition"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ─── File upload field ─────────────────────────────────────────────────────────

function FileUploadField({
  label,
  hint,
  accept,
  sessionId,
  fileType,
  onUploaded,
}: {
  label: string
  hint?: string
  accept?: string
  sessionId: string
  fileType: 'dl-front' | 'dl-back'
  onUploaded: (path: string) => void
}) {
  const [status, setStatus]  = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [filename, setFilename] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error')
      return
    }
    setStatus('uploading')
    setFilename(file.name)
    try {
      const fd = new FormData()
      fd.append('session_id', sessionId)
      fd.append('file_type',  fileType)
      fd.append('file',       file)
      const res  = await fetch('/api/booking/rental-agreement/upload', { method: 'POST', body: fd })
      const body = await res.json() as { ok?: boolean; path?: string; error?: string }
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Upload failed')
      onUploaded(body.path!)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void upload(file)
  }

  return (
    <div>
      <label className="block font-sans text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1">
        {label}
      </label>
      {hint && <p className="font-sans text-xs text-charcoal/40 mb-2">{hint}</p>}
      <div
        className={[
          'flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition',
          status === 'done'  ? 'border-forest-500/50 bg-forest-50' :
          status === 'error' ? 'border-red-400/50 bg-red-50' :
          'border-charcoal/20 hover:border-gold-400/50 bg-cream-50',
        ].join(' ')}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {status === 'done' ? (
          <Check className="w-4 h-4 text-forest-600 shrink-0" />
        ) : status === 'uploading' ? (
          <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin shrink-0" />
        ) : status === 'error' ? (
          <X className="w-4 h-4 text-red-500 shrink-0" />
        ) : (
          <Upload className="w-4 h-4 text-charcoal/40 shrink-0" />
        )}
        <span className="font-sans text-sm text-charcoal/70 truncate">
          {status === 'done'      ? filename ?? 'Uploaded'
           : status === 'uploading' ? 'Uploading…'
           : status === 'error'     ? 'Upload failed — try again'
           : 'Choose file (JPEG or PNG, max 5 MB)'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? 'image/jpeg,image/png,image/webp'}
        className="sr-only"
        onChange={onChange}
        aria-hidden
      />
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  current,
  completed,
}: {
  steps: typeof STEPS
  current: Step
  completed: Set<Step>
}) {
  const idx = steps.findIndex((s) => s.id === current)
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done   = completed.has(step.id)
        const active = step.id === current
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center font-sans text-xs font-bold transition-colors',
                  done   ? 'bg-forest-600 border-forest-600 text-white' :
                  active ? 'bg-gold-400 border-gold-400 text-white' :
                  'bg-cream-100 border-charcoal/20 text-charcoal/40',
                ].join(' ')}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={[
                  'font-sans text-[0.65rem] font-semibold uppercase tracking-wide hidden sm:block',
                  active ? 'text-gold-600' : done ? 'text-forest-700' : 'text-charcoal/35',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'h-px flex-1 mx-1 mb-4 transition-colors',
                  i < idx ? 'bg-forest-500' : 'bg-charcoal/15',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block font-sans text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full px-3 py-2.5 rounded-lg border border-charcoal/20 bg-white font-sans text-sm text-charcoal',
        'focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingSuccessClient({
  paid,
  tripSummary,
  stripeSessionId,
  reservationId,
  reservationStatus = null,
  hostName = 'the Host',
  vehicleYear = '',
  vehicleMake = '',
  vehicleModel = '',
  vin,
  licensePlate,
}: Props) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [currentStep, setCurrentStep]     = useState<Step>('dl')
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())
  const [allDone, setAllDone]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const workspaceTitleRef = useRef<HTMLHeadingElement>(null)

  // DL fields
  const [dlName,    setDlName]    = useState('')
  const [dlNumber,  setDlNumber]  = useState('')
  const [dlState,   setDlState]   = useState('')
  const [dlExpiry,  setDlExpiry]  = useState('')

  // Insurance fields
  const [insCarrier,  setInsCarrier]  = useState('')
  const [insPolicy,   setInsPolicy]   = useState('')
  const [insThrough,  setInsThrough]  = useState('')
  const [insLiab,     setInsLiab]     = useState(false)
  const [insComp,     setInsComp]     = useState(false)

  // Agreement
  const [agreementRead, setAgreementRead] = useState(false)

  // Signature
  const [sigDataUrl, setSigDataUrl]     = useState<string | null>(null)
  const [sigTyped,   setSigTyped]       = useState('')

  const agreementSections = tripSummary
    ? buildAgreementSections({
        renterFullName:             dlName || '___________________',
        vehicleYear,
        vehicleMake,
        vehicleModel,
        vehicleTitle:               tripSummary.title,
        vin,
        licensePlate,
        pickupLocation:             tripSummary.location,
        startDate:                  fmtDate(tripSummary.startDate),
        endDate:                    fmtDate(tripSummary.endDate),
        nights:                     tripSummary.nights,
        guests:                     tripSummary.guests,
        tripTotalFormatted:         money(tripSummary.tripTotalCents),
        reservationFeePaidFormatted: money(tripSummary.reservationFeeCents),
        hostName,
      } as AgreementParams)
    : []

  // Focus workspace heading when it opens
  useEffect(() => {
    if (workspaceOpen) {
      setTimeout(() => workspaceTitleRef.current?.focus(), 150)
    }
  }, [workspaceOpen])

  const openWorkspace = () => setWorkspaceOpen(true)

  const markComplete = (step: Step) => {
      setCompletedSteps((prev) => {
        const next = new Set<Step>(prev)
        next.add(step)
        return next
      })
  }

  const saveDl = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/booking/rental-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: stripeSessionId,
          step: 'dl',
          dl_legal_name: dlName,
          dl_number:     dlNumber,
          dl_state:      dlState,
          dl_expiry:     dlExpiry || null,
        }),
      })
      if (!res.ok) {
        const b = await res.json() as { error?: string }
        throw new Error(b.error ?? 'Save failed')
      }
      markComplete('dl')
      setCurrentStep('insurance')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const saveInsurance = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/booking/rental-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:                  stripeSessionId,
          step:                        'insurance',
          ins_carrier:                 insCarrier,
          ins_policy_number:           insPolicy,
          ins_effective_through:       insThrough || null,
          ins_liability_confirmed:     insLiab,
          ins_comp_collision_confirmed: insComp,
        }),
      })
      if (!res.ok) {
        const b = await res.json() as { error?: string }
        throw new Error(b.error ?? 'Save failed')
      }
      markComplete('insurance')
      setCurrentStep('agreement')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const saveSignature = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      let signaturePath: string | null = null

      const imageDataUrl =
        sigDataUrl ??
        (sigTyped.trim() ? typedNameToSignatureDataUrl(sigTyped.trim()) : null)

      // Upload canvas / typed script signature as PNG when available
      if (imageDataUrl) {
        const blob      = await (await fetch(imageDataUrl)).blob()
        const file      = new File([blob], 'signature.png', { type: 'image/png' })
        const fd        = new FormData()
        fd.append('session_id', stripeSessionId)
        fd.append('file_type',  'signature')
        fd.append('file',       file)
        const upRes  = await fetch('/api/booking/rental-agreement/upload', { method: 'POST', body: fd })
        const upBody = await upRes.json() as { ok?: boolean; path?: string; error?: string }
        if (!upRes.ok) throw new Error(upBody.error ?? 'Signature upload failed')
        signaturePath = upBody.path!
      }

      const res = await fetch('/api/booking/rental-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:          stripeSessionId,
          step:                'complete',
          agreement_read:      agreementRead,
          signer_printed_name: sigTyped || dlName,
          signature_path:      signaturePath,
        }),
      })
      if (!res.ok) {
        const b = await res.json() as { error?: string }
        throw new Error(b.error ?? 'Save failed')
      }
      markComplete('agreement')
      setAllDone(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const dlValid      = Boolean(dlName.trim() && dlNumber.trim() && dlState.trim())
  const insValid     = Boolean(insCarrier.trim() && insPolicy.trim() && insLiab && insComp)
  const sigValid     = Boolean((sigDataUrl || sigTyped.trim()) && agreementRead)

  const awaitingHostApproval = reservationStatus === 'pending_host'

  if (!paid || !tripSummary) {
    return (
      <div className="min-h-screen bg-cream-100 pt-8 pb-20 px-6">
        <div className="max-w-xl mx-auto bg-cream-50 border border-cream-300/60 rounded-sm shadow-luxury-sm overflow-hidden">
          <div className="p-8 text-center">
            <p className="font-sans text-sm text-charcoal/55">
              Thank you — your reservation fee payment is processing.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 font-sans text-sm font-medium text-charcoal underline underline-offset-[5px] decoration-charcoal/40 hover:decoration-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded-sm"
            >
              Done
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 pt-8 pb-20 px-4 lg:px-6">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className={[
          'mx-auto',
          workspaceOpen
            ? 'flex flex-col lg:flex-row items-start gap-6 max-w-5xl'
            : 'max-w-xl',
        ].join(' ')}
      >
        {/* ── Summary card ── */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 280, damping: 32 }}
          className={[
            'bg-cream-50 border border-cream-300/60 rounded-sm shadow-luxury-sm overflow-hidden',
            workspaceOpen ? 'w-full lg:w-[420px] shrink-0' : 'w-full',
          ].join(' ')}
        >
          {/* Hero image */}
          <div className="relative h-52 w-full bg-charcoal/5">
            <Image
              src={tripSummary.primaryImage}
              alt={tripSummary.title}
              fill
              className="object-cover"
              sizes="(max-width: 576px) 100vw, 420px"
              priority
            />
          </div>

          <div className="p-8 text-center space-y-6">
            <h1 className="font-serif text-3xl font-semibold text-charcoal">
              {awaitingHostApproval ? 'Payment received!' : 'Your trip is booked!'}
            </h1>

            {/* Trip details */}
            <div className="font-sans text-sm text-charcoal/70 text-left space-y-3 border-y border-cream-300/80 py-6">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-charcoal/45">Vehicle</span>
                <span className="font-serif text-lg font-semibold text-charcoal">{tripSummary.title}</span>
                <span className="text-xs uppercase tracking-wide text-charcoal/50">{tripSummary.category}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-charcoal/40 mt-0.5 shrink-0" />
                <span>{tripSummary.location}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1">
                <span className="text-charcoal/55">Trip dates</span>
                <span className="font-medium text-charcoal text-right tabular-nums">
                  {fmtDate(tripSummary.startDate)} → {fmtDate(tripSummary.endDate)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-charcoal/55">Stay</span>
                <span className="font-medium text-charcoal tabular-nums">
                  {tripSummary.nights} night{tripSummary.nights !== 1 ? 's' : ''} · {tripSummary.guests} guest{tripSummary.guests !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-cream-300/60 pt-3 mt-1">
                <span className="text-charcoal/55">Trip total</span>
                <span className="font-semibold text-charcoal tabular-nums">{money(tripSummary.tripTotalCents)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-charcoal/55">Reservation fee paid today</span>
                <span className="font-semibold text-forest-800 tabular-nums">{money(tripSummary.reservationFeeCents)}</span>
              </div>
            </div>

            {/* Confirmation / next steps — directly after pricing */}
            <section aria-label="Booking status" className="text-center px-1">
              {awaitingHostApproval ? (
                <p className="font-sans text-base sm:text-lg font-semibold text-charcoal leading-relaxed">
                  {hostName} will review your dates next. Watch your inbox — you&apos;ll get a confirmation email when your trip is approved. Your rental paperwork (driver license, insurance, and agreement) unlocks after that.
                </p>
              ) : (
                <p className="font-sans text-xl sm:text-2xl font-bold text-charcoal leading-snug">
                  You will receive a confirmation email with your trip information!
                </p>
              )}
            </section>

            {/* Rental agreement CTA (hidden once complete — success is shown in the workspace panel) */}
            {!allDone && !awaitingHostApproval && (
              <div className="rounded-xl border border-gold-400/40 bg-gold-50/60 p-5 text-left">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-gold-600" />
                  </div>
                  <div>
                    <p className="font-sans text-sm font-semibold text-charcoal">Sign your rental agreement</p>
                    <p className="font-sans text-xs text-charcoal/55 mt-0.5">
                      Complete your driver license info, insurance details, and e-signature to finalize your booking.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openWorkspace}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-white shadow-gold transition hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                >
                  Review &amp; sign agreement
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <Link
              href="/"
              className="inline-block font-sans text-sm font-medium text-charcoal underline underline-offset-[5px] decoration-charcoal/40 hover:decoration-charcoal hover:text-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 rounded-sm pt-2"
            >
              Done
            </Link>
          </div>
        </motion.div>

        {/* ── Workspace panel ── */}
        <AnimatePresence>
          {workspaceOpen && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
              className="flex-1 min-w-0 bg-cream-50 border border-cream-300/60 rounded-sm shadow-luxury-sm p-6 sm:p-8"
            >
              {allDone ? (
                <div
                  className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-2 min-h-[min(420px,65vh)]"
                  role="status"
                  aria-live="polite"
                >
                  <div className="w-full max-w-md rounded-2xl border border-forest-500/30 bg-gradient-to-b from-forest-50/95 to-forest-50/70 px-8 sm:px-10 py-10 sm:py-12 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-forest-100 flex items-center justify-center mx-auto mb-6 ring-4 ring-forest-200/40">
                      <Check className="w-8 h-8 text-forest-700" strokeWidth={2.25} aria-hidden />
                    </div>
                    <h2 className="font-serif text-2xl sm:text-[1.65rem] font-semibold text-forest-900 tracking-tight mb-3">
                      Agreement signed
                    </h2>
                    <p className="font-sans text-sm text-forest-800/90 leading-relaxed mb-2">
                      Your rental agreement is complete and on file.
                    </p>
                    <p className="font-sans text-sm text-forest-800/75 leading-relaxed">
                      A copy of your signed rental agreement will be sent to your email for your records, along with your
                      driver license and insurance details as submitted.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h2
                    ref={workspaceTitleRef}
                    tabIndex={-1}
                    className="font-serif text-2xl font-semibold text-charcoal mb-2 focus-visible:outline-none"
                  >
                    Rental Agreement
                  </h2>
                  <p className="font-sans text-xs text-charcoal/45 mb-6">
                    Version {AGREEMENT_VERSION} · All information is stored securely.
                  </p>

                  <StepIndicator steps={STEPS} current={currentStep} completed={completedSteps} />

                  {/* Error banner */}
                  {saveError && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 font-sans text-sm text-red-700">
                      {saveError}
                    </div>
                  )}

                  {/* ── Step: Driver License ── */}
                  {currentStep === 'dl' && (
                <div className="space-y-5">
                  <div className="rounded-lg bg-amber-50 border border-amber-200/70 px-4 py-3 font-sans text-xs text-amber-800">
                    Your driver license information is collected for identity verification purposes only and is stored securely.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Legal name (as on license)</FieldLabel>
                      <Input
                        type="text"
                        value={dlName}
                        onChange={(e) => setDlName(e.target.value)}
                        placeholder="First Middle Last"
                        autoComplete="name"
                        aria-required
                      />
                    </div>
                    <div>
                      <FieldLabel required>License number</FieldLabel>
                      <Input
                        type="text"
                        value={dlNumber}
                        onChange={(e) => setDlNumber(e.target.value)}
                        placeholder="e.g. D1234567"
                        aria-required
                      />
                    </div>
                    <div>
                      <FieldLabel required>Issuing state / territory</FieldLabel>
                      <Input
                        type="text"
                        value={dlState}
                        onChange={(e) => setDlState(e.target.value)}
                        placeholder="e.g. CA"
                        maxLength={3}
                        aria-required
                      />
                    </div>
                    <div>
                      <FieldLabel>Expiration date</FieldLabel>
                      <Input
                        type="date"
                        value={dlExpiry}
                        onChange={(e) => setDlExpiry(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* DL photo uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <FileUploadField
                      label="License — front"
                      hint="JPEG or PNG, max 5 MB"
                      sessionId={stripeSessionId}
                      fileType="dl-front"
                      onUploaded={() => {}}
                    />
                    <FileUploadField
                      label="License — back"
                      hint="JPEG or PNG, max 5 MB"
                      sessionId={stripeSessionId}
                      fileType="dl-back"
                      onUploaded={() => {}}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void saveDl()}
                    disabled={!dlValid || saving}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-white shadow-gold transition hover:bg-gold-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                  >
                    {saving ? 'Saving…' : 'Save & continue'}
                    {!saving && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* ── Step: Insurance ── */}
              {currentStep === 'insurance' && (
                <div className="space-y-5">
                  <div className="rounded-lg bg-blue-50 border border-blue-200/70 px-4 py-3 font-sans text-xs text-blue-800">
                    Your personal auto or RV insurance must be in force and cover the full rental period. Provide the policy details below.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FieldLabel required>Insurance carrier name</FieldLabel>
                      <Input
                        type="text"
                        value={insCarrier}
                        onChange={(e) => setInsCarrier(e.target.value)}
                        placeholder="e.g. State Farm"
                        aria-required
                      />
                    </div>
                    <div>
                      <FieldLabel required>Policy number</FieldLabel>
                      <Input
                        type="text"
                        value={insPolicy}
                        onChange={(e) => setInsPolicy(e.target.value)}
                        placeholder="e.g. HO-1234567"
                        aria-required
                      />
                    </div>
                    <div>
                      <FieldLabel>Coverage effective through</FieldLabel>
                      <Input
                        type="date"
                        value={insThrough}
                        onChange={(e) => setInsThrough(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <p className="font-sans text-xs font-semibold text-charcoal/60 uppercase tracking-wide">Coverage attestations</p>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={insLiab}
                        onChange={(e) => setInsLiab(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-gold-500 shrink-0"
                        aria-required
                      />
                      <span className="font-sans text-sm text-charcoal/75 group-hover:text-charcoal transition leading-snug">
                        My policy includes <strong>bodily injury and property damage liability</strong> coverage at or above the minimums required by this Agreement (Section 6).
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={insComp}
                        onChange={(e) => setInsComp(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-gold-500 shrink-0"
                        aria-required
                      />
                      <span className="font-sans text-sm text-charcoal/75 group-hover:text-charcoal transition leading-snug">
                        My policy extends <strong>comprehensive and collision coverage</strong> (or equivalent protection) to non-owned recreational vehicles.
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('dl')}
                      className="flex-1 rounded-full border border-charcoal/20 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-charcoal/60 hover:text-charcoal hover:border-charcoal/35 transition focus-visible:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveInsurance()}
                      disabled={!insValid || saving}
                      className="flex-[2] inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-white shadow-gold transition hover:bg-gold-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                    >
                      {saving ? 'Saving…' : 'Save & continue'}
                      {!saving && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Agreement + signature (combined) ── */}
              {currentStep === 'agreement' && (
                <div className="space-y-5">
                  <div
                    className="h-72 overflow-y-auto rounded-xl border border-charcoal/15 bg-white px-5 py-4 space-y-5 text-sm font-sans text-charcoal/80 leading-relaxed scrollbar-thin scroll-smooth"
                    tabIndex={0}
                    aria-label="Rental agreement text"
                  >
                    <p className="font-sans text-[0.65rem] uppercase tracking-widest text-charcoal/35 font-semibold">
                      Camper Vans Rental — Rental Agreement v{AGREEMENT_VERSION}
                    </p>
                    {agreementSections.map((sec) => (
                      <div key={sec.heading}>
                        <p className="font-semibold text-charcoal mb-1">{sec.heading}</p>
                        <p className="whitespace-pre-line text-charcoal/75">{sec.body}</p>
                      </div>
                    ))}
                    <p className="font-sans text-[0.65rem] uppercase tracking-widest text-charcoal/30 pt-4 border-t border-charcoal/10">
                      ATTORNEY NOTICE: This template has not been reviewed by legal counsel. Consult a licensed attorney before using in production.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group mt-2">
                    <input
                      type="checkbox"
                      checked={agreementRead}
                      onChange={(e) => setAgreementRead(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-gold-500 shrink-0"
                      aria-required
                    />
                    <span className="font-sans text-sm text-charcoal/75 group-hover:text-charcoal transition leading-snug">
                      I have read and understood the Rental Agreement in its entirety and agree to be bound by its terms.
                    </span>
                  </label>

                  <div className="border-t border-charcoal/10 pt-5 space-y-4">
                    <div
                      className={`space-y-4 rounded-xl transition ${!agreementRead ? 'pointer-events-none opacity-45 select-none' : ''}`}
                      aria-disabled={!agreementRead}
                    >
                      <p className="font-sans text-sm text-charcoal/60">
                        Draw your signature below, or type your full legal name.
                      </p>

                      <SignatureCanvas onSave={setSigDataUrl} typedSignature={sigTyped} />

                      <div>
                        <FieldLabel>Or type your full legal name</FieldLabel>
                        <Input
                          type="text"
                          value={sigTyped}
                          onChange={(e) => setSigTyped(e.target.value)}
                          placeholder={dlName || 'Full legal name'}
                          autoComplete="name"
                          disabled={!agreementRead}
                        />
                        <p className="font-sans text-xs text-charcoal/40 mt-1">
                          Typing your name here constitutes a legal electronic signature.
                        </p>
                      </div>
                    </div>

                    <p className="font-sans text-xs text-charcoal/45">
                      By submitting, you agree that your electronic signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN). Your IP address and timestamp will be recorded.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('insurance')}
                      className="flex-1 rounded-full border border-charcoal/20 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-charcoal/60 hover:text-charcoal hover:border-charcoal/35 transition focus-visible:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSignature()}
                      disabled={!sigValid || saving}
                      className="flex-[2] inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-white shadow-gold transition hover:bg-gold-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                    >
                      {saving ? 'Submitting…' : 'Submit & sign'}
                      {!saving && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
