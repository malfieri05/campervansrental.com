'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export type ChatDocument = {
  id: string
  listing_id: string
  storage_path: string
  public_url: string | null
  mime_type: string | null
  original_filename: string | null
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
  error_message: string | null
  created_at: string
}

// ─── Add document record ──────────────────────────────────────────────────────

export async function addListingChatDocument(
  listingId: string,
  storagePath: string,
  publicUrl: string,
  mimeType: string,
  originalFilename: string
): Promise<{ id: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { id: null, error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: null, error: 'Unauthorized' }

  // Verify listing ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return { id: null, error: 'Listing not found' }

  const { data, error } = await supabase
    .from('listing_chat_documents')
    .insert({
      listing_id: listingId,
      owner_id: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: mimeType,
      original_filename: originalFilename,
      processing_status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) return { id: null, error: error?.message ?? 'Insert failed' }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { id: (data as { id: string }).id }
}

// ─── Delete document ──────────────────────────────────────────────────────────

export async function deleteListingChatDocument(
  documentId: string,
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  // Service role to also delete chunks
  const svc = createServiceRoleClient()
  if (svc) {
    await svc.from('listing_chat_chunks').delete().eq('document_id', documentId)
  }

  const { error } = await supabase
    .from('listing_chat_documents')
    .delete()
    .eq('id', documentId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { ok: true }
}

// ─── Fetch documents for a listing ───────────────────────────────────────────

export async function getListingChatDocuments(
  listingId: string
): Promise<{ docs: ChatDocument[]; error?: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { docs: [] }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { docs: [], error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('listing_chat_documents')
    .select('*')
    .eq('listing_id', listingId)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { docs: [], error: error.message }
  return { docs: (data ?? []) as ChatDocument[] }
}
