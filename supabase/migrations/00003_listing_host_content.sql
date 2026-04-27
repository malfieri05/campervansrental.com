-- Migration: Host content fields for Outdoorsy-parity tabs
-- Run in Supabase SQL editor or via: supabase db push

-- Details tab fields
alter table public.listings
  add column if not exists whats_included       text,
  add column if not exists listing_faqs         jsonb not null default '[]'::jsonb,
  add column if not exists trip_recommendations text,
  add column if not exists other_things_note    text;

-- Photos tab
alter table public.listings
  add column if not exists youtube_video_url    text;

-- Delivery tab extra charge field
alter table public.listings
  add column if not exists delivery_per_mile_cents  int not null default 0;

-- Profit plan tab — full pricing rules engine
-- Each element: {
--   id: uuid string,
--   kind: 'min_stay' | 'length_discount' | 'date_price_adjustment',
--   name: string,
--   summaryLines: string[],
--   datesLabel: string,       -- "Everyday" or "Oct 31 - Nov 2, 2025" etc.
--   enabled: boolean,
--   status: 'active' | 'expired',
--   -- kind-specific:
--   minNights?: number,       -- for min_stay
--   tiers?: { nights: number, pct: number }[], -- for length_discount
--   startDate?: string, endDate?: string, nightlyDeltaCents?: number -- for date_price_adjustment
-- }
alter table public.listings
  add column if not exists pricing_rules        jsonb not null default '[]'::jsonb;
