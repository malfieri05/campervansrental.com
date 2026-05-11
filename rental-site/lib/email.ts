/**
 * Transactional email via Resend when RESEND_API_KEY is set.
 */
import { format, parseISO } from 'date-fns'
import { Resend } from 'resend'
import { siteUrl } from '@/lib/env'
import { getCategoryLabel } from '@/lib/data'
import type { Van } from '@/types'
import { reservationFeeRefundPolicyCopy } from '@/lib/booking-pricing'

export type BookingConfirmationPayload = {
  to: string
  guestFirstName: string
  guestLastName: string
  guestPhone: string
  reservationId: string
  listingTitle: string
  listingSlug: string
  listingCategory: string
  pickupLocation: string
  startDate: string
  endDate: string
  nights: number
  guests: number
  subtotalCents: number
  feesCents: number
  totalCents: number
  reservationFeePaidCents: number
  /** listings.cancellation_policy — drives reservation-fee refund copy */
  cancellationPolicy?: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'MMM d, yyyy')
  } catch {
    return isoDate
  }
}

function money(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
}

function defaultFrom(): string {
  const raw = process.env.RESEND_FROM?.trim()
  if (raw) return raw
  return 'Camper Vans Rental <onboarding@resend.dev>'
}

/** Sends booking confirmation after reservation fee payment. No-op if RESEND_API_KEY is unset. */
export async function sendBookingConfirmationEmail(
  payload: BookingConfirmationPayload
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[email] RESEND_API_KEY not set; skipping booking confirmation email')
    }
    return { ok: true, skipped: true }
  }

  const {
    to,
    guestFirstName,
    guestLastName,
    guestPhone,
    reservationId,
    listingTitle,
    listingSlug,
    listingCategory,
    pickupLocation,
    startDate,
    endDate,
    nights,
    guests,
    subtotalCents,
    feesCents,
    totalCents,
    reservationFeePaidCents,
    cancellationPolicy,
  } = payload

  const feePolicyCopy = reservationFeeRefundPolicyCopy(cancellationPolicy)
  const guestName = [guestFirstName, guestLastName].filter(Boolean).join(' ') || 'Guest'
  const categoryLabel = getCategoryLabel(listingCategory as Van['category'])
  const listingUrl = `${siteUrl()}/listings/${listingSlug}`
  const balanceCents = Math.max(0, totalCents - reservationFeePaidCents)

  const dateRange = `${fmtDate(startDate)} – ${fmtDate(endDate)}`
  const subject = `Your trip is booked — ${listingTitle}`

  const textLines = [
    `Hi ${guestName},`,
    '',
    `Thank you for booking with Camper Vans Rental. Your reservation fee has been received and your trip is confirmed.`,
    '',
    'TRIP DETAILS',
    `Vehicle: ${listingTitle}`,
    `Category: ${categoryLabel}`,
    `Pickup: ${pickupLocation}`,
    `Dates: ${dateRange} (${nights} night${nights === 1 ? '' : 's'})`,
    `Guests: ${guests}`,
    '',
    'PRICING',
    `Rental subtotal: ${money(subtotalCents)}`,
    `Fees: ${money(feesCents)}`,
    `Estimated trip total: ${money(totalCents)}`,
    `Reservation fee paid today: ${money(reservationFeePaidCents)}`,
    `Estimated balance remaining: ${money(balanceCents)}`,
    '',
    `Reservation reference: ${reservationId}`,
    `View listing: ${listingUrl}`,
    '',
    'YOUR CONTACT INFO ON FILE',
    `Email: ${to}`,
    `Phone: ${guestPhone}`,
    '',
    `Reservation fee policy: ${feePolicyCopy}`,
    '',
    'We’ll follow up with any next steps before your trip. If you have questions, reply to this email.',
    '',
    '— Camper Vans Rental',
  ]

  const text = textLines.join('\n')

  const e = escapeHtml
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4dc;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#333;">Hi ${e(guestName)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#333;">
                Thank you for booking with <strong>Camper Vans Rental</strong>. Your reservation fee has been received and <strong>your trip is confirmed</strong>.
              </p>
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a67c2d;font-weight:600;">Trip details</p>
              <table role="presentation" width="100%" style="margin-bottom:20px;font-size:14px;line-height:1.6;color:#222;">
                <tr><td style="padding:4px 0;color:#666;width:120px;">Vehicle</td><td style="padding:4px 0;"><strong>${e(listingTitle)}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#666;">Category</td><td style="padding:4px 0;">${e(categoryLabel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Pickup</td><td style="padding:4px 0;">${e(pickupLocation)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Dates</td><td style="padding:4px 0;">${e(dateRange)} · ${nights} night${nights === 1 ? '' : 's'}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Guests</td><td style="padding:4px 0;">${guests}</td></tr>
              </table>
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a67c2d;font-weight:600;">Pricing</p>
              <table role="presentation" width="100%" style="margin-bottom:20px;font-size:14px;line-height:1.6;color:#222;">
                <tr><td style="padding:4px 0;color:#666;">Rental subtotal</td><td style="padding:4px 0;text-align:right;">${money(subtotalCents)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fees</td><td style="padding:4px 0;text-align:right;">${money(feesCents)}</td></tr>
                <tr><td style="padding:8px 0 4px;border-top:1px solid #eee;"><strong>Estimated trip total</strong></td><td style="padding:8px 0 4px;border-top:1px solid #eee;text-align:right;"><strong>${money(totalCents)}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#666;">Reservation fee paid today</td><td style="padding:4px 0;text-align:right;color:#2d5a3d;font-weight:600;">${money(reservationFeePaidCents)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Est. balance remaining</td><td style="padding:4px 0;text-align:right;">${money(balanceCents)}</td></tr>
              </table>
              <p style="margin:0 0 6px;font-size:12px;color:#555;">Reservation reference: <code style="background:#f0ebe3;padding:2px 6px;border-radius:4px;font-size:12px;">${e(reservationId)}</code></p>
              <p style="margin:0 0 20px;font-size:14px;">
                <a href="${e(listingUrl)}" style="color:#8b6914;font-weight:600;">View your listing online →</a>
              </p>
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a67c2d;font-weight:600;">Your contact info</p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.55;color:#444;">${e(to)}<br/>${e(guestPhone)}</p>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#666;border-left:3px solid #d4b87a;padding-left:12px;">${e(feePolicyCopy)}</p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#333;">We’ll follow up with any next steps before your trip. Questions? Reply to this email.</p>
              <p style="margin:20px 0 0;font-size:13px;color:#888;">— Camper Vans Rental</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: defaultFrom(),
      to: [to],
      subject,
      text,
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'send failed'
    console.error('[email]', message)
    return { ok: false, error: message }
  }
}
