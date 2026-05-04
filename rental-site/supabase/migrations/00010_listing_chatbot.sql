-- Per-listing RAG chatbot: schema changes + pgvector + documents + chunks tables

-- pgvector extension (required for embedding columns)
create extension if not exists vector;

-- ─── Chatbot toggle + notes on listings ──────────────────────────────────────

alter table public.listings
  add column if not exists listing_chatbot_enabled boolean not null default false,
  add column if not exists listing_chatbot_notes text;

comment on column public.listings.listing_chatbot_enabled is 'Whether the listing assistant chatbot is visible on the public listing page';
comment on column public.listings.listing_chatbot_notes is 'Host freeform knowledge-base text included in chatbot context';

-- ─── Documents uploaded for chatbot training ─────────────────────────────────

create table if not exists public.listing_chat_documents (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete cascade,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  storage_path   text not null,
  public_url     text,
  mime_type      text,
  original_filename text,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'ready', 'failed')),
  error_message  text,
  created_at     timestamptz not null default now()
);

create index if not exists listing_chat_documents_listing_idx
  on public.listing_chat_documents (listing_id);

comment on table public.listing_chat_documents is 'Uploaded PDFs/docs that feed into per-listing RAG chatbot';

-- ─── Text chunks + embeddings ─────────────────────────────────────────────────

create table if not exists public.listing_chat_chunks (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  document_id uuid references public.listing_chat_documents (id) on delete cascade,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

create index if not exists listing_chat_chunks_listing_idx
  on public.listing_chat_chunks (listing_id);

-- IVFFlat index — works from ~100+ rows; adjust lists as data grows
create index if not exists listing_chat_chunks_embedding_idx
  on public.listing_chat_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

comment on table public.listing_chat_chunks is 'Chunked + embedded text from listing documents and KB notes for RAG retrieval';

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.listing_chat_documents enable row level security;
alter table public.listing_chat_chunks enable row level security;

-- Hosts can see/manage their own listing documents
create policy "listing_chat_documents_host_select"
  on public.listing_chat_documents for select
  using (owner_id = auth.uid());

create policy "listing_chat_documents_host_insert"
  on public.listing_chat_documents for insert
  with check (owner_id = auth.uid());

create policy "listing_chat_documents_host_update"
  on public.listing_chat_documents for update
  using (owner_id = auth.uid());

create policy "listing_chat_documents_host_delete"
  on public.listing_chat_documents for delete
  using (owner_id = auth.uid());

-- Chunks are server-only (service role bypasses RLS); no public read
-- No non-service-role select policy intentionally — chatbot reads via service role

-- Allow service role to manage chunks (service role bypasses RLS by default in Postgres)
-- We expose no client read policy so chunk contents stay server-side only

-- ─── Similarity search helper function ───────────────────────────────────────
-- Called by the chat API via the service-role client

create or replace function match_listing_chunks (
  p_listing_id uuid,
  p_embedding  vector(1536),
  p_match_count int default 5
)
returns table (
  id         uuid,
  content    text,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    lcc.id,
    lcc.content,
    1 - (lcc.embedding <=> p_embedding) as similarity
  from listing_chat_chunks lcc
  where lcc.listing_id = p_listing_id
    and lcc.embedding is not null
  order by lcc.embedding <=> p_embedding
  limit p_match_count;
end;
$$;
