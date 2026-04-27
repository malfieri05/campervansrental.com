-- Camper vans rental marketplace: profiles, listings, images, availability, reservations
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_host boolean not null default false,
  stripe_customer_id text,
  stripe_connect_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null,
  tagline text,
  description text,
  vehicle_class text,
  vehicle_year int,
  vehicle_make text,
  vehicle_model text,
  length_label text,
  sleeps int not null default 2,
  seatbelts int,
  location_label text,
  delivery_offered boolean not null default false,
  delivery_radius_miles int,
  delivery_fee_cents int default 0,
  category text not null default 'classic' check (
    category in ('classic', 'adventure', 'luxury', 'ultra-luxury')
  ),
  price_per_night_cents int not null,
  cleaning_fee_cents int not null default 15000,
  insurance_fee_cents int not null default 7500,
  min_nights int not null default 1,
  amenities jsonb not null default '[]'::jsonb,
  features text[] not null default '{}',
  rules jsonb not null default '{}'::jsonb,
  cancellation_notes text,
  rating numeric(2,1) not null default 4.9,
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_owner_idx on public.listings (owner_id);
create index if not exists listings_status_idx on public.listings (status);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images (listing_id);

-- Host-blocked or system holds (inclusive date ranges)
create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  block_type text not null default 'host_blocked' check (
    block_type in ('host_blocked', 'confirmed_reservation')
  ),
  reservation_id uuid,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists availability_blocks_listing_idx on public.availability_blocks (listing_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid references public.profiles (id) on delete set null,
  start_date date not null,
  end_date date not null,
  guests int not null default 2,
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'confirmed', 'cancelled')
  ),
  subtotal_cents int not null default 0,
  fees_cents int not null default 0,
  total_cents int not null default 0,
  deposit_cents int not null default 0,
  pickup_location text,
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,
  special_requests text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists reservations_listing_idx on public.reservations (listing_id);
create index if not exists reservations_renter_idx on public.reservations (renter_id);
create index if not exists reservations_status_idx on public.reservations (status);

alter table public.availability_blocks
  add constraint availability_blocks_reservation_fk
  foreign key (reservation_id) references public.reservations (id) on delete cascade;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, is_host)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

drop trigger if exists set_reservations_updated_at on public.reservations;
create trigger set_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.reservations enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Listings: public read for published; owners see their drafts
create policy "listings_select_visible"
  on public.listings for select
  using (
    status = 'published'
    or owner_id = auth.uid()
  );

create policy "listings_insert_host"
  on public.listings for insert
  with check (owner_id = auth.uid());

create policy "listings_update_owner"
  on public.listings for update
  using (owner_id = auth.uid());

create policy "listings_delete_owner"
  on public.listings for delete
  using (owner_id = auth.uid());

-- Images
create policy "listing_images_select"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.owner_id = auth.uid())
    )
  );

create policy "listing_images_insert_owner"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "listing_images_update_owner"
  on public.listing_images for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "listing_images_delete_owner"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- Availability
create policy "availability_select"
  on public.availability_blocks for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.owner_id = auth.uid())
    )
  );

create policy "availability_write_owner"
  on public.availability_blocks for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "availability_update_owner"
  on public.availability_blocks for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "availability_delete_owner"
  on public.availability_blocks for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- Reservations
create policy "reservations_select_parties"
  on public.reservations for select
  using (
    renter_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "reservations_insert_renter"
  on public.reservations for insert
  with check (renter_id = auth.uid());

create policy "reservations_update_renter"
  on public.reservations for update
  using (renter_id = auth.uid());

-- Storage bucket (create in dashboard or SQL)
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "listing_images_storage_read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "listing_images_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
