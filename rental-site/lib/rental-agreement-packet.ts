import type { AgreementSection } from '@/lib/rental-agreement-template'
import { AGREEMENT_VERSION } from '@/lib/rental-agreement-template'

export type SubmissionPacketFields = {
  dl_legal_name: string | null
  dl_number: string | null
  dl_state: string | null
  dl_expiry: string | null
  ins_carrier: string | null
  ins_policy_number: string | null
  ins_effective_through: string | null
  ins_liability_confirmed: boolean | null
  ins_comp_collision_confirmed: boolean | null
  signer_printed_name: string | null
  signed_at: string | null
}

export function buildRentalAgreementPlainText(
  sections: AgreementSection[],
  meta: SubmissionPacketFields & {
    reservationId: string
    listingTitle: string
    tripDatesLabel: string
  }
): string {
  const lines: string[] = [
    'CAMPER VANS RENTAL — RENTAL AGREEMENT',
    `Version ${AGREEMENT_VERSION}`,
    '',
    `Reservation ID: ${meta.reservationId}`,
    `Vehicle / listing: ${meta.listingTitle}`,
    `Trip dates: ${meta.tripDatesLabel}`,
    '',
    '— AGREEMENT TEXT —',
    '',
  ]

  for (const sec of sections) {
    lines.push(sec.heading, '', sec.body, '', '')
  }

  lines.push(
    '— DRIVER LICENSE (ON FILE) —',
    '',
    `Legal name: ${meta.dl_legal_name ?? '—'}`,
    `License number: ${meta.dl_number ?? '—'}`,
    `State / territory: ${meta.dl_state ?? '—'}`,
    `Expiration: ${meta.dl_expiry ?? '—'}`,
    '',
    '— INSURANCE (ON FILE) —',
    '',
    `Carrier: ${meta.ins_carrier ?? '—'}`,
    `Policy number: ${meta.ins_policy_number ?? '—'}`,
    `Coverage effective through: ${meta.ins_effective_through ?? '—'}`,
    `Liability minimums attested: ${meta.ins_liability_confirmed ? 'Yes' : 'No'}`,
    `Comp / collision on non-owned RV attested: ${meta.ins_comp_collision_confirmed ? 'Yes' : 'No'}`,
    '',
    '— ELECTRONIC SIGNATURE —',
    '',
    `Signer printed name: ${meta.signer_printed_name ?? '—'}`,
    `Signed at (UTC): ${meta.signed_at ?? '—'}`,
    '',
    'Driver license images and signature image are attached to this email when provided.',
    '',
    'End of packet',
  )

  return lines.join('\n')
}
