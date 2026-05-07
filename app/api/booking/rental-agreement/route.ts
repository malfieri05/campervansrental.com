/**
 * POST /api/booking/rental-agreement
 * Upserts the rental agreement submission for a confirmed reservation.
 * Authorization: caller must provide a valid paid Stripe session_id whose
 * metadata.reservation_id matches the submitted data — no bearer token required.
 *
 * Body (JSON):
 *   { session_id, step: 'dl' | 'insurance' | 'signature' | 'complete', ...fields }
 *
 * GET /api/booking/rental-agreement?session_id=xxx
 * Returns current submission status / draft fields.
 */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AGREEMENT_VERSION } from '@/lib/rental-agreement-template'
import { sendRentalAgreementCompletionPacketIfNeeded } from '@/lib/rental-agreement-completion-email'

// ─── Shared auth helper ──────────────────────────────────────────────────────

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

  if (session.payment_status !== 'paid') {
    return { error: 'Session not paid', status: 403 }
  }

  const reservationId = session.metadata?.reservation_id
  if (!reservationId) return { error: 'Reservation not found in session', status: 400 }

  return { reservationId }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const auth = await authorizeSession(sessionId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const svc = createServiceRoleClient()
  if (!svc) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })

  const { data: rs } = await svc
    .from('reservations')
    .select('status')
    .eq('id', auth.reservationId)
    .maybeSingle()
  if (rs?.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'The host must confirm your booking before you can complete the rental agreement.' },
      { status: 403 },
    )
  }

  const { data } = await svc
    .from('rental_agreement_submissions')
    .select('*')
    .eq('reservation_id', auth.reservationId)
    .maybeSingle()

  return NextResponse.json({ submission: data ?? null })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = body.session_id
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const auth = await authorizeSession(sessionId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const svc = createServiceRoleClient()
  if (!svc) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })

  const { data: rsPost } = await svc
    .from('reservations')
    .select('status')
    .eq('id', auth.reservationId)
    .maybeSingle()
  if (rsPost?.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'The host must confirm your booking before you can complete the rental agreement.' },
      { status: 403 },
    )
  }

  const step = body.step as string | undefined

  if (step === 'complete') {
    const { data: priorComplete } = await svc
      .from('rental_agreement_submissions')
      .select('id, completed_at')
      .eq('reservation_id', auth.reservationId)
      .maybeSingle()
    if (priorComplete?.completed_at) {
      try {
        await sendRentalAgreementCompletionPacketIfNeeded(svc, auth.reservationId)
      } catch (e) {
        console.error('[rental-agreement] completion packet email retry:', e)
      }
      return NextResponse.json({
        ok: true,
        id: priorComplete.id,
        completed: true,
        idempotent: true,
      })
    }
  }


  // Build upsert payload based on which step is being saved
  type SubmissionRow = Record<string, unknown>
  const upsert: SubmissionRow = {
    reservation_id: auth.reservationId,
    agreement_version: AGREEMENT_VERSION,
  }

  if (step === 'dl' || step === 'complete') {
    if (body.dl_legal_name !== undefined)  upsert.dl_legal_name  = body.dl_legal_name
    if (body.dl_number !== undefined)      upsert.dl_number      = body.dl_number
    if (body.dl_state !== undefined)       upsert.dl_state       = body.dl_state
    if (body.dl_expiry !== undefined)      upsert.dl_expiry      = body.dl_expiry
  }

  if (step === 'insurance' || step === 'complete') {
    if (body.ins_carrier !== undefined)                    upsert.ins_carrier                    = body.ins_carrier
    if (body.ins_policy_number !== undefined)              upsert.ins_policy_number              = body.ins_policy_number
    if (body.ins_effective_through !== undefined)          upsert.ins_effective_through          = body.ins_effective_through
    if (body.ins_liability_confirmed !== undefined)        upsert.ins_liability_confirmed        = Boolean(body.ins_liability_confirmed)
    if (body.ins_comp_collision_confirmed !== undefined)   upsert.ins_comp_collision_confirmed   = Boolean(body.ins_comp_collision_confirmed)
  }

  if (step === 'signature' || step === 'complete') {
    if (body.agreement_read !== undefined)    upsert.agreement_read    = Boolean(body.agreement_read)
    if (body.signer_printed_name !== undefined) upsert.signer_printed_name = body.signer_printed_name
    if (body.signature_path !== undefined)    upsert.signature_path    = body.signature_path
    upsert.signed_at = new Date().toISOString()
  }

  if (step === 'complete') {
    upsert.completed_at = new Date().toISOString()
  }

  const { data, error } = await svc
    .from('rental_agreement_submissions')
    .upsert(upsert, { onConflict: 'reservation_id' })
    .select('id, completed_at')
    .single()

  if (error) {
    console.error('[rental-agreement] upsert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (step === 'complete') {
    try {
      await sendRentalAgreementCompletionPacketIfNeeded(svc, auth.reservationId)
    } catch (e) {
      console.error('[rental-agreement] completion packet email:', e)
    }
  }

  return NextResponse.json({ ok: true, id: data.id, completed: Boolean(data.completed_at) })
}
