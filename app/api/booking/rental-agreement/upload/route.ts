/**
 * POST /api/booking/rental-agreement/upload
 * Uploads DL front/back photos or the signature PNG to the private
 * 'rental-agreement-docs' Supabase Storage bucket.
 *
 * Authorization: multipart form field `session_id` (paid Stripe session).
 * Form fields: session_id, file_type ('dl-front' | 'dl-back' | 'signature'), file (binary).
 *
 * Returns: { path: string } — the storage object path (not a public URL).
 */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BUCKET = 'rental-agreement-docs'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function authorizeSession(
  sessionId: string
): Promise<{ reservationId: string } | { error: string; status: number }> {
  const stripe = getStripe()
  if (!stripe) return { error: 'Stripe not configured', status: 503 }
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return { error: 'Invalid or expired session', status: 400 }
  }
  if (session.payment_status !== 'paid') return { error: 'Session not paid', status: 403 }
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) return { error: 'Reservation not found in session', status: 400 }
  return { reservationId }
}

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const sessionId = formData.get('session_id')
  const fileType  = formData.get('file_type')
  const file      = formData.get('file')

  if (typeof sessionId !== 'string') return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  if (typeof fileType !== 'string' || !['dl-front', 'dl-back', 'signature'].includes(fileType)) {
    return NextResponse.json({ error: 'file_type must be dl-front | dl-back | signature' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` }, { status: 413 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP allowed' }, { status: 415 })
  }

  const auth = await authorizeSession(sessionId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const svc = createServiceRoleClient()
  if (!svc) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  const { data: rsRow } = await svc
    .from('reservations')
    .select('status')
    .eq('id', auth.reservationId)
    .maybeSingle()
  if (rsRow?.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'The host must confirm your booking before you can upload documents.' },
      { status: 403 },
    )
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${auth.reservationId}/${fileType}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await svc.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (error) {
    console.error('[rental-agreement/upload]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Persist the path on the submission row
  const colMap: Record<string, string> = {
    'dl-front': 'dl_front_path',
    'dl-back':  'dl_back_path',
    'signature': 'signature_path',
  }
  await svc
    .from('rental_agreement_submissions')
    .upsert({ reservation_id: auth.reservationId, [colMap[fileType]]: path }, { onConflict: 'reservation_id' })

  return NextResponse.json({ ok: true, path })
}
