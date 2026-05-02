/**
 * Camper Van Rental Agreement Template — Version 1.0
 *
 * LEGAL NOTICE: This template is provided as a starting point only.
 * A licensed attorney familiar with the laws of your operating jurisdiction(s)
 * should review, revise, and approve this agreement before use in production.
 * This document does not constitute legal advice.
 */

export const AGREEMENT_VERSION = '1.0'

export interface AgreementParams {
  renterFullName: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vehicleTitle: string
  vin?: string
  licensePlate?: string
  pickupLocation: string
  startDate: string   // human-readable, e.g. "Jun 26, 2026"
  endDate: string
  nights: number
  guests: number
  tripTotalFormatted: string          // e.g. "$199.00"
  reservationFeePaidFormatted: string // e.g. "$49.75"
  hostName: string
  platformName?: string
}

export function buildAgreementSections(p: AgreementParams): AgreementSection[] {
  const platform = p.platformName ?? 'Camper Vans Rental'
  const vehicle = `${p.vehicleYear} ${p.vehicleMake} ${p.vehicleModel}`.trim() || p.vehicleTitle

  return [
    {
      heading: '1. Parties',
      body: `This Peer-to-Peer Recreational Vehicle Rental Agreement ("Agreement") is entered into as of the date of the Renter's electronic signature below between:

Host / Owner: ${p.hostName}, a registered host on the ${platform} platform ("Host"); and

Renter: ${p.renterFullName} ("Renter").

${platform} is a technology platform that facilitates connections between Hosts and Renters; it is not a party to this Agreement and does not own or operate the Vehicle. All rights, obligations, and liabilities under this Agreement run between Host and Renter only.`,
    },
    {
      heading: '2. Vehicle Description',
      body: `Vehicle: ${vehicle}
${p.vin ? `VIN: ${p.vin}` : ''}
${p.licensePlate ? `License Plate: ${p.licensePlate}` : ''}
Pickup / Return Location: ${p.pickupLocation}

The Host represents that the Vehicle is in roadworthy condition, properly registered, and has adequate insurance coverage at the time of rental.`,
    },
    {
      heading: '3. Rental Period and Charges',
      body: `Rental Start: ${p.startDate}
Rental End: ${p.endDate}
Duration: ${p.nights} night${p.nights !== 1 ? 's' : ''} / up to ${p.guests} guest${p.guests !== 1 ? 's' : ''}

Estimated Trip Total: ${p.tripTotalFormatted}
Reservation Fee Paid at Booking: ${p.reservationFeePaidFormatted}

The reservation fee is a non-refundable deposit except as described in the cancellation policy provided at time of booking. The remaining balance is due as stated in the booking confirmation. Any additional charges (mileage overages, generator hours, cleaning fees for extraordinary conditions, fuel, tolls, and similar out-of-pocket costs) are the Renter's responsibility and may be invoiced separately by the Host.`,
    },
    {
      heading: '4. Renter Representations and Eligibility',
      body: `The Renter represents and warrants that:

a) The Renter is at least 25 years of age (or the minimum age specified by the Host, whichever is greater).

b) The Renter holds a valid, current driver's license issued by a U.S. state or territory (or, for international renters, a valid foreign license accompanied by an International Driving Permit) and is legally permitted to operate the Vehicle.

c) The Renter has not been convicted of a DUI, DWI, or reckless driving offense within the past five (5) years.

d) The Renter has personal automobile insurance in force that meets the minimum requirements set out in Section 6 below, or has otherwise arranged coverage acceptable to the Host.

e) All statements made to the Host and ${platform} in connection with this rental are accurate and complete.`,
    },
    {
      heading: '5. Authorized Drivers',
      body: `Only the Renter and any additional drivers expressly approved in writing by the Host prior to the rental start date are authorized to operate the Vehicle. Permitting an unauthorized driver to operate the Vehicle is a material breach of this Agreement and may void insurance coverage.`,
    },
    {
      heading: '6. Insurance Requirements',
      body: `The Renter must maintain, for the full rental period, personal automobile or RV insurance providing at minimum:

a) Bodily Injury Liability: $100,000 per person / $300,000 per occurrence (or applicable state minimum if higher).
b) Property Damage Liability: $50,000 per occurrence (or applicable state minimum if higher).
c) Comprehensive and Collision coverage with a deductible not exceeding $2,500, or an equivalent protection plan.

The Renter must provide proof of insurance (carrier name, policy number, and effective dates) at or before pickup. If the Renter's policy does not provide the required coverage on a non-owned recreational vehicle, the Renter must obtain a supplemental policy or a short-term RV insurance rider before the rental start date. Neither the Host nor ${platform} is responsible for any gap in coverage.`,
    },
    {
      heading: '7. Permitted and Prohibited Uses',
      body: `The Renter agrees to use the Vehicle solely for lawful personal recreational travel and to:

a) Operate the Vehicle only on paved public roads and designated campground access roads unless the Vehicle is specifically marketed for off-road use and the Host has given written approval.
b) Not operate the Vehicle under the influence of alcohol, controlled substances, or any impairing medication.
c) Not transport more passengers than the Vehicle's seatbelt capacity.
d) Not use the Vehicle for commercial hire, rideshare, or any fee-generating transport of persons.
e) Not take the Vehicle outside the contiguous United States or Canada without the Host's prior written approval (additional insurance and permitting may apply).
f) Not engage in racing, stunts, or other reckless activities.
g) Not smoke tobacco, cannabis, or any substance inside the Vehicle.
h) Not transport pets unless the Host has expressly permitted it in the booking listing.
i) Comply with all traffic laws, campground regulations, weight restrictions, and environmental rules applicable to the Vehicle.`,
    },
    {
      heading: '8. Vehicle Condition; Pickup and Return',
      body: `At pickup, the Renter and Host (or Host's representative) will together document the Vehicle's condition including any pre-existing damage using photos or a written checklist. The Renter is responsible for returning the Vehicle:

a) In the same condition as at pickup, normal wear and tear excepted.
b) With the same fuel level (or as otherwise agreed in writing).
c) At the agreed return location and no later than the agreed return time. Late returns will be charged at the daily rate pro-rated per hour unless otherwise agreed.
d) With all personal property and debris removed; extraordinary cleaning costs are billed to the Renter.

The Renter agrees to report any accident, mechanical failure, or damage immediately to the Host and, where required by law, to the appropriate authorities.`,
    },
    {
      heading: '9. Damage, Theft, and Liability',
      body: `The Renter is financially responsible for:

a) Any physical damage to the Vehicle not documented at pickup, up to the full replacement value, subject to applicable insurance coverage.
b) Any third-party property damage or bodily injury caused by the Renter's operation of the Vehicle, to the extent not covered by insurance.
c) Traffic citations, parking fines, toll violations, and campground fees incurred during the rental period.
d) Towing and recovery costs caused by the Renter's violation of Section 7 (Prohibited Uses) or by mechanical damage attributable to Renter negligence (e.g. engine damage from running without oil).

The Host remains responsible for pre-existing defects that the Host failed to disclose at pickup.`,
    },
    {
      heading: '10. Indemnification',
      body: `To the fullest extent permitted by law, the Renter agrees to indemnify, defend, and hold harmless the Host, ${platform}, and their respective officers, employees, and agents from and against any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) the Renter's use or misuse of the Vehicle; (b) the Renter's breach of this Agreement; or (c) any violation of law or third-party rights by the Renter during the rental period.`,
    },
    {
      heading: '11. Limitation of Liability',
      body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE HOST OR ${platform.toUpperCase()} BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF THIS AGREEMENT OR THE RENTAL, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE. THE HOST'S AGGREGATE LIABILITY TO THE RENTER SHALL NOT EXCEED THE AMOUNT OF THE RESERVATION FEE PAID BY THE RENTER.

Nothing in this section limits liability for gross negligence, willful misconduct, personal injury, or death.`,
    },
    {
      heading: '12. Cancellation and Refunds',
      body: `Cancellation terms are those displayed in the listing at the time of booking. In the event of a Host cancellation, the Renter is entitled to a full refund of all amounts paid. Neither party waives any rights available under applicable consumer protection law.`,
    },
    {
      heading: '13. Dispute Resolution',
      body: `The parties agree to attempt to resolve any dispute informally by contacting ${platform} support within thirty (30) days of the event giving rise to the dispute. If informal resolution fails, disputes shall be submitted to binding arbitration administered under rules mutually agreed by the parties, or, if no agreement is reached, in a court of competent jurisdiction in the state where the Vehicle was picked up.

[ATTORNEY NOTE: Insert governing law and venue clause specific to your jurisdiction.]`,
    },
    {
      heading: '14. Entire Agreement; Amendments',
      body: `This Agreement, together with the booking confirmation and the Host's listing rules incorporated by reference, constitutes the entire agreement between the parties with respect to the rental and supersedes all prior representations and understandings. No modification of this Agreement is effective unless made in writing and signed by both parties. If any provision of this Agreement is found unenforceable, the remaining provisions continue in full force.`,
    },
    {
      heading: '15. Electronic Signature',
      body: `The Renter agrees that an electronic signature (including a drawn or typed signature submitted through the ${platform} platform) is a legally binding signature for the purposes of this Agreement under applicable federal and state electronic signature laws (including, without limitation, the Electronic Signatures in Global and National Commerce Act, 15 U.S.C. § 7001 et seq.). The Renter's IP address, device fingerprint, and timestamp will be recorded at the time of signature for evidentiary purposes.`,
    },
  ]
}

export interface AgreementSection {
  heading: string
  body: string
}
