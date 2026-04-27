-- Migration: Add Outdoorsy-parity fields to listings table
-- Run in Supabase SQL editor or via: supabase db push

-- Vehicle identity & compliance
alter table public.listings
  add column if not exists vin                   text,
  add column if not exists license_plate         text,
  add column if not exists registration_doc_url  text,
  add column if not exists insurance_doc_url     text;

-- Extended pricing
alter table public.listings
  add column if not exists weekly_rate_cents      int,
  add column if not exists monthly_rate_cents     int,
  add column if not exists security_deposit_cents int not null default 100000,
  add column if not exists mileage_fee_cents      int not null default 0,
  add column if not exists generator_fee_cents    int not null default 0;

-- Add-ons (array of {id, name, description, price_cents, charge_type})
alter table public.listings
  add column if not exists add_ons jsonb not null default '[]'::jsonb;

-- Structured cancellation policy (replaces free-text cancellation_notes)
alter table public.listings
  add column if not exists cancellation_policy text
    check (cancellation_policy in ('flexible', 'moderate', 'strict'));

-- Availability constraints
alter table public.listings
  add column if not exists max_nights      int,
  add column if not exists lead_time_days  int not null default 1,
  add column if not exists buffer_days     int not null default 0;

-- Address fields (structured, for map display and distance calc)
alter table public.listings
  add column if not exists address_street text,
  add column if not exists address_city   text,
  add column if not exists address_state  text,
  add column if not exists address_zip    text,
  add column if not exists address_country text not null default 'US';
