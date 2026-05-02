/**
 * Trip total for the rental period (nightly rate × nights only).
 * Cleaning, protection, and vehicle security deposit are excluded for now.
 */
export function tripTotalCentsExcludingSecurityDeposit(args: {
  pricePerNightCents: number
  nights: number
}): number {
  const { pricePerNightCents, nights } = args
  return pricePerNightCents * nights
}

/** Good-faith hold: 25% of trip total (rent only). Stripe USD minimum $0.50. */
export function reservationFeeCents(tripTotalCents: number): number {
  if (tripTotalCents <= 0) return 0
  const raw = Math.round(tripTotalCents * 0.25)
  return Math.max(50, raw)
}

export const RESERVATION_FEE_REFUND_COPY =
  'The reservation fee is fully refundable if you cancel 28 or more days before your trip start date.'

/** Tooltip next to “Reservation fee” (checkout / review summaries). */
export const RESERVATION_FEE_TOOLTIP = RESERVATION_FEE_REFUND_COPY
