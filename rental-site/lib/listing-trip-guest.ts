import type { Van } from '@/types'

/** Format listing `rules` trip time (HTML time `HH:mm`) for guest-facing copy. */
export function formatHostTripTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (!m) return s
  const hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return s
  const d = new Date(2000, 0, 1, hh, mm)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function hostTripPickupTime(van: Pick<Van, 'rules'>): string | null {
  const r = van.rules ?? {}
  return formatHostTripTime(r.tripPickupTime)
}

export function hostTripReturnTime(van: Pick<Van, 'rules'>): string | null {
  const r = van.rules ?? {}
  return formatHostTripTime(r.tripReturnTime)
}

export function pickupProcedureText(van: Pick<Van, 'pickupDropoffRulesText'>): string | null {
  const t = van.pickupDropoffRulesText?.trim()
  return t || null
}

export function pickupProcedureDocUrl(van: Pick<Van, 'pickupDropoffRulesDocUrl'>): string | null {
  const u = van.pickupDropoffRulesDocUrl?.trim()
  return u || null
}

export function hasPickupProcedureSection(van: Pick<Van, 'pickupDropoffRulesText' | 'pickupDropoffRulesDocUrl'>): boolean {
  return Boolean(pickupProcedureText(van) || pickupProcedureDocUrl(van))
}
