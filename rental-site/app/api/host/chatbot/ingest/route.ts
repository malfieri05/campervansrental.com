/**
 * POST /api/host/chatbot/ingest
 *
 * Downloads an already-uploaded document from Supabase Storage, extracts its
 * text, chunks it, and stores embeddings in listing_chat_chunks. Called by the
 * host UI after a file is uploaded and the document row is created.
 *
 * Body: { documentId: string, listingId: string, publicUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
// pdf-parse ships CJS only; use require() to avoid ESM default-export issue
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ingestDocumentChunks } from '@/lib/chatbot'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  // Auth: must be a signed-in host
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.documentId || !body?.listingId || !body?.publicUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { documentId, listingId, publicUrl } = body as {
    documentId: string
    listingId: string
    publicUrl: string
  }

  // Verify ownership via anon client (RLS)
  const { data: doc } = await supabase
    .from('listing_chat_documents')
    .select('id, mime_type, processing_status')
    .eq('id', documentId)
    .eq('listing_id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const svc = createServiceRoleClient()
  if (!svc) return NextResponse.json({ error: 'Service role unavailable' }, { status: 503 })

  // Mark as processing
  await svc
    .from('listing_chat_documents')
    .update({ processing_status: 'processing' })
    .eq('id', documentId)

  try {
    // Fetch raw file bytes
    const fileRes = await fetch(publicUrl, { signal: AbortSignal.timeout(20000) })
    if (!fileRes.ok) throw new Error(`Fetch failed: ${fileRes.status}`)

    const contentLength = Number(fileRes.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BYTES) throw new Error('File too large (max 10 MB)')

    const arrayBuffer = await fileRes.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_BYTES) throw new Error('File too large (max 10 MB)')

    const buffer = Buffer.from(arrayBuffer)
    const mimeType = (doc as { mime_type: string | null }).mime_type ?? ''

    let text = ''
    if (mimeType === 'application/pdf' || publicUrl.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else {
      // .txt, .md, .csv and other plain-text formats
      text = buffer.toString('utf-8')
    }

    text = text.trim()
    if (!text) throw new Error('No readable text found in file')

    const result = await ingestDocumentChunks(listingId, documentId, text)
    if (!result.ok) throw new Error(result.error)

    await svc
      .from('listing_chat_documents')
      .update({ processing_status: 'ready', error_message: null })
      .eq('id', documentId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed'
    await svc
      .from('listing_chat_documents')
      .update({ processing_status: 'failed', error_message: message })
      .eq('id', documentId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
