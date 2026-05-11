import { redirect } from 'next/navigation'

/**
 * Legacy “Reserve Your Van” wizard was removed.
 * Preserve old /booking URLs by redirecting to fleet with the same query string.
 */
export default function BookingRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams()
  for (const [key, raw] of Object.entries(searchParams)) {
    const v = Array.isArray(raw) ? raw[0] : raw
    if (typeof v === 'string' && v !== '') qs.set(key, v)
  }
  redirect(qs.size > 0 ? `/fleet?${qs.toString()}` : '/fleet')
}
