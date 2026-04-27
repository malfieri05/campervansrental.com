-- Catch-up migration: safe to run if earlier migrations were skipped or partially applied.
-- Fixes "Could not find the 'add_ons' column of 'listings' in the schema cache" and similar errors.

-- From 00002_listing_fields_v2.sql
alter table public.listings
  add column if not exists vin                   text,
  add column if not exists license_plate         text,
  add column if not exists registration_doc_url  text,
  add column if not exists insurance_doc_url     text;

alter table public.listings
  add column if not exists weekly_rate_cents       int,
  add column if not exists monthly_rate_cents    int,
  add column if not exists security_deposit_cents int not null default 100000,
  add column if not exists mileage_fee_cents     int not null default 0,
  add column if not exists generator_fee_cents   int not null default 0;

alter table public.listings
  add column if not exists add_ons jsonb not null default '[]'::jsonb;

alter table public.listings
  add column if not exists cancellation_policy text
    check (cancellation_policy in ('flexible', 'moderate', 'strict'));

alter table public.listings
  add column if not exists max_nights      int,
  add column if not exists lead_time_days  int not null default 1,
  add column if not exists buffer_days     int not null default 0;

alter table public.listings
  add column if not exists address_street text,
  add column if not exists address_city   text,
  add column if not exists address_state  text,
  add column if not exists address_zip    text,
  add column if not exists address_country text not null default 'US';

-- From 00003_listing_host_content.sql
alter table public.listings
  add column if not exists whats_included       text,
  add column if not exists listing_faqs       jsonb not null default '[]'::jsonb,
  add column if not exists trip_recommendations text,
  add column if not exists other_things_note    text;

alter table public.listings
  add column if not exists youtube_video_url    text;

alter table public.listings
  add column if not exists delivery_per_mile_cents int not null default 0;

alter table public.listings
  add column if not exists pricing_rules        jsonb not null default '[]'::jsonb;
