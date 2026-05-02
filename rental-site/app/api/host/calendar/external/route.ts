import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET  /api/host/calendar/external?listing_id=<id>  — list feeds for a listing
// POST /api/host/calendar/external                  — create a new feed
// PATCH/DELETE handled via /api/host/calendar/external/[id]

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listingId = req.nextUrl.searchParams.get('listing_id')
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('listing_external_calendars')
    .select('id, display_name, ical_url, last_synced_at, last_sync_error, created_at')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feeds: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { listing_id, display_name, ical_url } = body ?? {}
  if (!listing_id || !display_name || !ical_url) {
    return NextResponse.json({ error: 'listing_id, display_name, and ical_url are required' }, { status: 400 })
  }

  // Validate URL format
  try { new URL(ical_url) } catch {
    return NextResponse.json({ error: 'ical_url must be a valid URL' }, { status: 400 })
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listing_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('listing_external_calendars')
    .insert({ listing_id, owner_id: user.id, display_name, ical_url })
    .select('id, display_name, ical_url, last_synced_at, last_sync_error, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feed: data }, { status: 201 })
}
