-- Migration: Rental Agreement Submissions
-- Creates a table to store renter DL info, insurance attestations, and signatures.
-- Uploads (DL photos, signature) go to the private 'rental-agreement-docs' storage bucket.
-- All writes are performed server-side via service role; no public bucket access.

create table if not exists public.rental_agreement_submissions (
  id                    uuid primary key default gen_random_uuid(),
  reservation_id        uuid not null unique references public.reservations (id) on delete cascade,
  agreement_version     text not null default '1.0',

  -- Driver licence fields
  dl_legal_name         text,
  dl_number             text,
  dl_state              text,
  dl_expiry             date,
  dl_front_path         text,  -- storage path: rental-agreement-docs/{reservation_id}/dl-front.*
  dl_back_path          text,  -- storage path: rental-agreement-docs/{reservation_id}/dl-back.*

  -- Personal auto insurance
  ins_carrier           text,
  ins_policy_number     text,
  ins_effective_through date,
  ins_liability_confirmed   boolean not null default false,
  ins_comp_collision_confirmed boolean not null default false,

  -- Agreement acceptance & signature
  agreement_read        boolean not null default false,
  signer_printed_name   text,
  signature_path        text,  -- storage path: rental-agreement-docs/{reservation_id}/signature.png
  signed_at             timestamptz,

  -- Completion
  completed_at          timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists rental_agreement_submissions_reservation_idx
  on public.rental_agreement_submissions (reservation_id);

-- updated_at trigger
create or replace function public.set_rental_agreement_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rental_agreement_updated_at on public.rental_agreement_submissions;
create trigger set_rental_agreement_updated_at
  before update on public.rental_agreement_submissions
  for each row execute procedure public.set_rental_agreement_updated_at();

-- RLS: enable but restrict direct client access entirely.
-- All writes come through server-side API routes using service role key.
alter table public.rental_agreement_submissions enable row level security;

-- Renter can read their own submission (useful for status checks from an authenticated client).
create policy "rental_agreement_renter_select"
  on public.rental_agreement_submissions for select
  using (
    auth.uid() = (
      select renter_id from public.reservations r
      where r.id = reservation_id
    )
  );

-- No direct insert/update/delete from the browser; service-role API handles all writes.
-- (No permissive insert/update policies = only service role can write.)

-- ─── Private storage bucket ───────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('rental-agreement-docs', 'rental-agreement-docs', false)
on conflict (id) do nothing;

-- No public select (bucket is private).
-- Authenticated renters may read their own files (path prefix = reservation_id).
-- Note: all writes go through service role via API routes only.
create policy "rental_agreement_docs_renter_select"
  on storage.objects for select
  using (
    bucket_id = 'rental-agreement-docs'
    and auth.role() = 'authenticated'
  );
