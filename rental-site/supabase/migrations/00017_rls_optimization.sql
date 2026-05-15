-- RLS optimization — Maps to Phase 2 Batch C, item C6.
--
-- The public catalog reads (listings + child tables via the anon client) go
-- through RLS policies that evaluate a per-row EXISTS / owner-id check.
-- For child tables (listing_images, availability_blocks, listing_reviews) the
-- policy does an EXISTS (SELECT 1 FROM listings WHERE id = $fk AND status = 'published')
-- for every row returned, which scales poorly.
--
-- Strategy: use a SECURITY DEFINER view for the published listing catalog.
-- The view runs as the definer (service role), so Postgres evaluates the WHERE
-- clause once at the view level rather than per-row in child-table policies.
-- Public reads go through this view; authenticated writes continue to use the
-- base tables with full RLS.

-- Published listings view (anon-safe — exposes only published rows and
-- non-sensitive columns already visible through existing RLS).
CREATE OR REPLACE VIEW public.published_listings
WITH (security_invoker = false) AS
SELECT
  id,
  slug,
  title,
  tagline,
  description,
  length_label,
  sleeps,
  seatbelts,
  location_label,
  address_city,
  address_state,
  address_country,
  category,
  vehicle_class,
  vehicle_year,
  vehicle_make,
  vehicle_model,
  price_per_night_cents,
  cleaning_fee_cents,
  insurance_fee_cents,
  min_nights,
  security_deposit_cents,
  amenities,
  features,
  rules,
  rating,
  review_count,
  whats_included,
  listing_faqs,
  trip_recommendations,
  youtube_video_url,
  pickup_dropoff_rules_text,
  pickup_dropoff_rules_doc_url,
  listing_chatbot_enabled,
  cancellation_policy,
  updated_at,
  created_at
FROM public.listings
WHERE status = 'published';

-- Grant anon read access to the view.
GRANT SELECT ON public.published_listings TO anon;
GRANT SELECT ON public.published_listings TO authenticated;

-- NOTE: To migrate the anon client queries in lib/supabase/anon.ts to use this
-- view instead of the base `listings` table, replace:
--   supabase.from('listings').select(...).eq('status', 'published')
-- with:
--   supabase.from('published_listings').select(...)
-- This lets Postgres skip the per-row RLS check entirely for anonymous reads.
