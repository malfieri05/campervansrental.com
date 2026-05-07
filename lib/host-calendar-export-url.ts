import { createHmac } from 'crypto'

export function makeCalendarExportToken(listingId: string): string {
  const secret = process.env.CALENDAR_EXPORT_SECRET
  if (!secret) throw new Error('CALENDAR_EXPORT_SECRET not set')
  return createHmac('sha256', secret).update(listingId).digest('hex')
}

export function buildHostCalendarExportUrl(listingId: string, baseUrl: string): string {
  const token = makeCalendarExportToken(listingId)
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/api/host/calendar/export/${listingId}?token=${token}`
}
