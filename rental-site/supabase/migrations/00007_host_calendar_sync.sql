-- Migration: External calendar sync for host calendar
-- Adds listing_external_calendars table, external_calendar_id FK on availability_blocks,
-- and extends block_type to include 'external_sync'.

-- ─── External calendars table ─────────────────────────────────────────────────

create table if not exists public.listing_external_calendars (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references public.listings (id) on delete cascade,
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  display_name      text not null,
  ical_url          text not null,
  last_synced_at    timestamptz,
  last_sync_error   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists external_calendars_listing_idx
  on public.listing_external_calendars (listing_id);
create index if not exists external_calendars_owner_idx
  on public.listing_external_calendars (owner_id);

-- updated_at trigger
create or replace function public.set_external_calendars_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_external_calendars_updated_at on public.listing_external_calendars;
create trigger set_external_calendars_updated_at
  before update on public.listing_external_calendars
  for each row execute procedure public.set_external_calendars_updated_at();

-- RLS
alter table public.listing_external_calendars enable row level security;

create policy "external_calendars_owner_all"
  on public.listing_external_calendars for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ─── Extend availability_blocks ───────────────────────────────────────────────

-- Add external_calendar_id FK (nullable — null for host_blocked and confirmed_reservation rows).
alter table public.availability_blocks
  add column if not exists external_calendar_id uuid
    references public.listing_external_calendars (id) on delete cascade;

-- Widen block_type check to allow 'external_sync'.
-- Postgres requires dropping + re-adding the constraint.
alter table public.availability_blocks
  drop constraint if exists availability_blocks_block_type_check;

alter table public.availability_blocks
  add constraint availability_blocks_block_type_check
  check (block_type in ('host_blocked', 'confirmed_reservation', 'external_sync'));

-- Index for fast feed-specific deletes during sync.
create index if not exists availability_blocks_external_cal_idx
  on public.availability_blocks (external_calendar_id)
  where external_calendar_id is not null;
