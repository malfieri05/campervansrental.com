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

export type ListingCancellationPolicy = 'flexible' | 'moderate' | 'strict'

export function normalizeListingCancellationPolicy(
  raw: string | null | undefined
): ListingCancellationPolicy {
  if (raw === 'flexible' || raw === 'moderate' || raw === 'strict') return raw
  return 'moderate'
}

/**
 * How the reservation fee lines up with the host’s Outdoorsy-style cancellation tier
 * (same windows/percentages as the listing’s Flexible / Moderate / Strict preset).
 */
export function reservationFeeRefundPolicyCopy(
  cancellationPolicy: string | null | undefined
): string {
  const p = normalizeListingCancellationPolicy(cancellationPolicy)
  switch (p) {
    case 'flexible':
      return "This host's Flexible policy: full refund of trip amounts you've paid (including this reservation fee) if you cancel 5 or more days before trip start; 75% refund if you cancel within 5 days."
    case 'moderate':
      return "This host's Moderate policy: 75% refund if you cancel 7 or more days before trip start; 50% refund if you cancel within 7 days. The reservation fee follows the same schedule."
    case 'strict':
      return "This host's Strict policy: 50% refund if you cancel 14 or more days before trip start; no refund of trip payment if you cancel within 14 days (including this reservation fee)."
  }
}
