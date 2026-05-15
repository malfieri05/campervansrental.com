import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  try {
    const svc = createServiceRoleClient()
    if (!svc) return NextResponse.json({ ok: true })

    const { data: row, error } = await svc
      .from('listings')
      .select('id, view_count')
      .eq('slug', params.slug)
      .maybeSingle()

    if (error || !row?.id) return NextResponse.json({ ok: true })

    await svc
      .from('listings')
      .update({ view_count: (row.view_count ?? 0) + 1 })
      .eq('id', row.id)
  } catch {
    // Column may not exist until migration 00002 is applied — non-critical.
  }

  return NextResponse.json({ ok: true })
}
