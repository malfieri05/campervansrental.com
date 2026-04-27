/**
 * Transactional email — wire Resend (or similar) when RESEND_API_KEY is set.
 * Confirmed reservations and host notifications can call sendReservationConfirmed.
 */
export async function sendReservationConfirmed(_payload: {
  to: string
  listingTitle: string
  startDate: string
  endDate: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[email] RESEND_API_KEY not set; skipping sendReservationConfirmed')
    }
    return
  }
  // Optional: import { Resend } from 'resend' and send templated email
}
