import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildHostCalendarExportUrl } from '@/lib/host-calendar-export-url'

export const dynamic = 'force-dynamic'

function resolveBaseUrl(req: NextRequest): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!host) return null
  const rawProto = req.headers.get('x-forwarded-proto') ?? 'http'
  const proto = rawProto.split(',')[0].trim()
  return `${proto}://${host}`
}

/**
 * Authenticated hosts: returns the unique iCal subscription URL for a listing they own.
 * Keeps HMAC secret server-only; works in dev when NEXT_PUBLIC_SITE_URL is unset (uses request Host).
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listingId = req.nextUrl.searchParams.get('listing_id')
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const baseUrl = resolveBaseUrl(req)
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_SITE_URL or ensure Host header is present.' },
      { status: 503 },
    )
  }

  try {
    const url = buildHostCalendarExportUrl(listingId, baseUrl)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json(
      { error: 'Calendar export secret is not configured on the server.' },
      { status: 503 },
    )
  }
}
