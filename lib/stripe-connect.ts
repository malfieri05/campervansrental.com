/**
 * Phase 2: Stripe Connect for host payouts.
 * Call createConnectAccountLink once you onboard hosts for split charges / transfers.
 */
export function connectOnboardingNotes(): string {
  return 'Enable Stripe Connect in Dashboard; store stripe_connect_account_id on profiles; use Checkout with application_fee_amount or separate transfers.'
}
