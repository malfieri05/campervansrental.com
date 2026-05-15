/**
 * Sends the signed rental agreement packet (plain-text agreement + DL / signature files)
 * to the renter and host separately after completion. Idempotent via completion_email_sent_at.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { Resend } from 'resend'
import {
  buildAgreementSections,
  type AgreementParams,
} from '@/lib/rental-agreement-template'
import { buildRentalAgreementPlainText, type SubmissionPacketFields } from '@/lib/rental-agreement-packet'

const BUCKET = 'rental-agreement-docs'

type ListingRow = {
  title: string
  slug: string
  category: string
  location_label: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  vin: string | null
  license_plate: string | null
  owner_id: string
  profiles: { display_name: string | null } | { display_name: string | null }[] | null
}

type ReservationRow = {
  id: string
  guest_email: string | null
  guest_first_name: string | null
  guest_last_name: string | null
  start_date: string
  end_date: string
  guests: number
  total_cents: number
  deposit_cents: number
  listings: ListingRow | ListingRow[] | null
}

type SubmissionRow = SubmissionPacketFields & {
  reservation_id: string
  completed_at: string | null
  packet_email_renter_sent_at?: string | null
  packet_email_host_sent_at?: string | null
  agreement_version: string
  dl_front_path: string | null
  dl_back_path: string | null
  signature_path: string | null
}

function defaultFrom(): string {
  const raw = process.env.RESEND_FROM?.trim()
  if (raw) return raw
  return 'Camper Vans Rental <onboarding@resend.dev>'
}

function money(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function fmtDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'MMM d, yyyy')
  } catch {
    return isoDate
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

async function downloadStorageFile(
  svc: SupabaseClient,
  path: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { data, error } = await svc.storage.from(BUCKET).download(path)
  if (error || !data) {
    console.warn('[rental-agreement-completion-email] storage download failed:', path, error?.message)
    return null
  }
  const ab = await data.arrayBuffer()
  const ext = (path.split('.').pop() ?? '').toLowerCase().replace('jpeg', 'jpg')
  const ct =
    ext === 'png'
      ? 'image/png'
      : ext === 'gif'
        ? 'image/gif'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg'
  return { buffer: Buffer.from(ab), contentType: ct }
}

function buildAttachments(
  plainText: string,
  submission: SubmissionRow,
  svc: SupabaseClient
): Promise<{ filename: string; content: Buffer; contentType?: string }[]> {
  const out: { filename: string; content: Buffer; contentType?: string }[] = [
    {
      filename: 'rental-agreement.txt',
      content: Buffer.from(plainText, 'utf8'),
      contentType: 'text/plain; charset=utf-8',
    },
  ]

  const extras: { path: string | null; filename: string }[] = [
    { path: submission.dl_front_path, filename: 'driver-license-front' },
    { path: submission.dl_back_path, filename: 'driver-license-back' },
    { path: submission.signature_path, filename: 'electronic-signature' },
  ]

  return (async () => {
    // Download all attachments in parallel — avoids sequential Storage round-trips.
    const downloads = await Promise.all(
      extras.map(async ({ path, filename }) => {
        if (!path?.trim()) return null
        const dl = await downloadStorageFile(svc, path)
        if (!dl) return null
        const ext = (path.split('.').pop() ?? 'bin').toLowerCase().replace('jpeg', 'jpg')
        return { filename: `${filename}.${ext}`, content: dl.buffer, contentType: dl.contentType }
      })
    )
    for (const attachment of downloads) {
      if (attachment) out.push(attachment)
    }
    return out
  })()
}

export async function sendRentalAgreementCompletionPacketIfNeeded(
  svc: SupabaseClient,
  reservationId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[rental-agreement-completion-email] RESEND_API_KEY not set; skipping packet emails')
    }
    return
  }

  const { data: submission, error: subErr } = await svc
    .from('rental_agreement_submissions')
    .select('*')
    .eq('reservation_id', reservationId)
    .maybeSingle()

  if (subErr || !submission) {
    console.warn('[rental-agreement-completion-email] no submission row:', subErr?.message)
    return
  }

  const row = submission as SubmissionRow
  if (!row.completed_at) return

  const { data: resv, error: resvErr } = await svc
    .from('reservations')
    .select(
      `
      id,
      guest_email,
      guest_first_name,
      guest_last_name,
      start_date,
      end_date,
      guests,
      total_cents,
      deposit_cents,
      listings (
        title,
        slug,
        category,
        location_label,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        vin,
        license_plate,
        owner_id,
        profiles:owner_id ( display_name )
      )
    `
    )
    .eq('id', reservationId)
    .maybeSingle()

  if (resvErr || !resv) {
    console.error('[rental-agreement-completion-email] reservation load failed:', resvErr?.message)
    return
  }

  const reservation = resv as ReservationRow
  const listing = one(reservation.listings)
  if (!listing) {
    console.error('[rental-agreement-completion-email] listing missing for reservation', reservationId)
    return
  }

  const hostProfile = one(listing.profiles)
  const hostName = hostProfile?.display_name?.trim() || 'the Host'

  const nights = Math.max(
    1,
    differenceInCalendarDays(parseISO(reservation.end_date), parseISO(reservation.start_date))
  )

  const params: AgreementParams = {
    renterFullName: row.dl_legal_name?.trim() || '___________________',
    vehicleYear: listing.vehicle_year != null ? String(listing.vehicle_year) : '',
    vehicleMake: listing.vehicle_make ?? '',
    vehicleModel: listing.vehicle_model ?? '',
    vehicleTitle: listing.title,
    vin: listing.vin ?? undefined,
    licensePlate: listing.license_plate ?? undefined,
    pickupLocation: listing.location_label?.trim() || 'See listing',
    startDate: fmtDate(reservation.start_date),
    endDate: fmtDate(reservation.end_date),
    nights,
    guests: reservation.guests,
    tripTotalFormatted: money(reservation.total_cents),
    reservationFeePaidFormatted: money(reservation.deposit_cents),
    hostName,
  }

  const sections = buildAgreementSections(params)
  const tripDatesLabel = `${fmtDate(reservation.start_date)} – ${fmtDate(reservation.end_date)}`

  const packetMeta: SubmissionPacketFields & {
    reservationId: string
    listingTitle: string
    tripDatesLabel: string
  } = {
    dl_legal_name: row.dl_legal_name,
    dl_number: row.dl_number,
    dl_state: row.dl_state,
    dl_expiry: row.dl_expiry,
    ins_carrier: row.ins_carrier,
    ins_policy_number: row.ins_policy_number,
    ins_effective_through: row.ins_effective_through,
    ins_liability_confirmed: row.ins_liability_confirmed,
    ins_comp_collision_confirmed: row.ins_comp_collision_confirmed,
    signer_printed_name: row.signer_printed_name,
    signed_at: row.signed_at,
    reservationId,
    listingTitle: listing.title,
    tripDatesLabel,
  }

  const plainBody = buildRentalAgreementPlainText(sections, packetMeta)
  const attachments = await buildAttachments(plainBody, row, svc)

  const guestName =
    [reservation.guest_first_name, reservation.guest_last_name].filter(Boolean).join(' ') || 'Guest'
  const renterEmail = reservation.guest_email?.trim() || ''

  let hostEmail = ''
  try {
    const { data: hostUser, error: hostErr } = await svc.auth.admin.getUserById(listing.owner_id)
    if (hostErr) console.warn('[rental-agreement-completion-email] host user lookup:', hostErr.message)
    else hostEmail = hostUser.user?.email?.trim() ?? ''
  } catch (e) {
    console.warn('[rental-agreement-completion-email] host user lookup failed:', e)
  }

  const needRenter = Boolean(renterEmail)
  const needHost = Boolean(hostEmail)
  if (!needRenter && !needHost) {
    console.warn('[rental-agreement-completion-email] no renter or host email; cannot send packet')
    return
  }

  const renterAlready = Boolean(row.packet_email_renter_sent_at)
  const hostAlready = Boolean(row.packet_email_host_sent_at)
  if ((!needRenter || renterAlready) && (!needHost || hostAlready)) return

  const resend = new Resend(apiKey)
  const e = escapeHtml

  const renterSubject = `Your signed rental agreement — ${listing.title}`
  const hostSubject = `Signed rental agreement — ${guestName} · ${listing.title}`

  const renterText = [
    `Hi ${guestName},`,
    '',
    'Thank you for completing your rental agreement.',
    '',
    'Attached to this email you will find:',
    '• A plain-text copy of the rental agreement you signed',
    '• Your driver license photos (if uploaded)',
    '• Your electronic signature image',
    '',
    'A copy of this packet is also being sent to your host for their records.',
    '',
    `Trip: ${tripDatesLabel} · ${listing.title}`,
    '',
    '— Camper Vans Rental',
  ].join('\n')

  const hostText = [
    `Hello ${hostName},`,
    '',
    `${guestName} has completed the rental agreement for:`,
    `${listing.title}`,
    `Trip dates: ${tripDatesLabel}`,
    '',
    'Attached: signed agreement text, driver license images (if provided), electronic signature, and insurance details as entered by the renter.',
    '',
    '— Camper Vans Rental',
  ].join('\n')

  const renterHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e8e4dc;overflow:hidden;">
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;">Hi ${e(guestName)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;">Thank you for completing your rental agreement. <strong>Please see the attachments</strong> for your signed agreement text, driver license images (if you uploaded them), and your electronic signature.</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#444;">We’ve also sent this same packet to your host for their records.</p>
          <p style="margin:0 0 8px;font-size:12px;color:#666;"><strong>Trip</strong> · ${e(tripDatesLabel)}<br/><strong>Vehicle</strong> · ${e(listing.title)}</p>
          <p style="margin:20px 0 0;font-size:13px;color:#888;">— Camper Vans Rental</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim()

  const hostHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e8e4dc;overflow:hidden;">
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;">Hello ${e(hostName)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;"><strong>${e(guestName)}</strong> has completed the rental agreement for <strong>${e(listing.title)}</strong>.</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#444;">Attachments include the agreement text, driver license photos (if provided), electronic signature, and insurance details as entered by the renter.</p>
          <p style="margin:0 0 8px;font-size:12px;color:#666;"><strong>Trip dates</strong> · ${e(tripDatesLabel)}</p>
          <p style="margin:20px 0 0;font-size:13px;color:#888;">— Camper Vans Rental</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim()

  const attachPayload = attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
  }))

  if (needRenter && !renterAlready) {
    const { error } = await resend.emails.send({
      from: defaultFrom(),
      to: [renterEmail],
      subject: renterSubject,
      text: renterText,
      html: renterHtml,
      attachments: attachPayload,
    })
    if (error) {
      console.error('[rental-agreement-completion-email] renter send failed:', error.message)
    } else {
      const { error: upErr } = await svc
        .from('rental_agreement_submissions')
        .update({ packet_email_renter_sent_at: new Date().toISOString() })
        .eq('reservation_id', reservationId)
      if (upErr) console.error('[rental-agreement-completion-email] renter sent flag:', upErr.message)
    }
  } else if (!needRenter) {
    console.warn('[rental-agreement-completion-email] no guest_email; skipping renter packet')
  }

  if (needHost && !hostAlready) {
    const { error } = await resend.emails.send({
      from: defaultFrom(),
      to: [hostEmail],
      subject: hostSubject,
      text: hostText,
      html: hostHtml,
      attachments: attachPayload,
    })
    if (error) {
      console.error('[rental-agreement-completion-email] host send failed:', error.message)
    } else {
      const { error: upErr } = await svc
        .from('rental_agreement_submissions')
        .update({ packet_email_host_sent_at: new Date().toISOString() })
        .eq('reservation_id', reservationId)
      if (upErr) console.error('[rental-agreement-completion-email] host sent flag:', upErr.message)
    }
  } else if (!needHost) {
    console.warn('[rental-agreement-completion-email] no host email; skipping host packet')
  }
}
