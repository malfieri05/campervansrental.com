/**
 * GET /api/host/chatbot/status?documentId=<id>
 * Returns the processing_status of a listing chat document (host-only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const documentId = req.nextUrl.searchParams.get('documentId')
  if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('listing_chat_documents')
    .select('processing_status, error_message')
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    status: (data as { processing_status: string }).processing_status,
    error_message: (data as { error_message: string | null }).error_message,
  })
}
