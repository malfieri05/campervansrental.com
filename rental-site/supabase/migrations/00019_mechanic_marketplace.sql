-- Phase 3 — Mechanic Marketplace schema
-- Adds mechanic profiles, quote system, messaging, geocoding columns, and
-- a sanitized public task feed view that keeps PII out of mechanic-visible rows.

-- ─── Geospatial extension ────────────────────────────────────────────────────
-- earthdistance + cube enable lat/lng radius queries without PostGIS.
CREATE EXTENSION IF NOT EXISTS cube CASCADE;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- ─── is_mechanic flag on profiles ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_mechanic boolean NOT NULL DEFAULT false;

-- ─── lat/lng on listings (geocoded on save) ───────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lat  double precision,
  ADD COLUMN IF NOT EXISTS lng  double precision;

CREATE INDEX IF NOT EXISTS listings_lat_lng_idx ON public.listings (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ─── mechanic_profiles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mechanic_profiles (
  id                    uuid    PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  business_name         text,
  display_name          text    NOT NULL,
  phone                 text,
  email                 text,
  service_radius_miles  int     NOT NULL DEFAULT 25,
  address_street        text,
  address_city          text,
  address_state         text,
  address_zip           text,
  lat                   double precision,
  lng                   double precision,
  specialties           jsonb   NOT NULL DEFAULT '[]'::jsonb,
  certifications        text,
  bio                   text,
  is_verified           boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  quotes_sent_count     int     NOT NULL DEFAULT 0,
  quotes_accepted_count int     NOT NULL DEFAULT 0,
  avg_rating            numeric(3,2),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mechanic_profiles_active_idx ON public.mechanic_profiles (is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS mechanic_profiles_lat_lng_idx ON public.mechanic_profiles (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE OR REPLACE TRIGGER set_mechanic_profiles_updated_at
  BEFORE UPDATE ON public.mechanic_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── mechanic_quotes ─────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS public.quote_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired'
);

CREATE TABLE IF NOT EXISTS public.mechanic_quotes (
  id                        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id                   uuid    NOT NULL REFERENCES public.vehicle_maintenance_tasks (id) ON DELETE CASCADE,
  mechanic_id               uuid    NOT NULL REFERENCES public.mechanic_profiles (id) ON DELETE CASCADE,
  listing_id                uuid    NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id                   uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount_cents              int     NOT NULL,
  estimated_duration_hours  numeric(4,1),
  earliest_available_date   date,
  notes                     text,
  status                    public.quote_status NOT NULL DEFAULT 'pending',
  expires_at                timestamptz,
  accepted_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, mechanic_id)
);

CREATE INDEX IF NOT EXISTS mechanic_quotes_task_status_idx ON public.mechanic_quotes (task_id, status);
CREATE INDEX IF NOT EXISTS mechanic_quotes_mechanic_status_idx ON public.mechanic_quotes (mechanic_id, status);
CREATE INDEX IF NOT EXISTS mechanic_quotes_host_idx ON public.mechanic_quotes (host_id);

CREATE OR REPLACE TRIGGER set_mechanic_quotes_updated_at
  BEFORE UPDATE ON public.mechanic_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── mechanic_task_messages ───────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS public.message_sender_role AS ENUM ('host', 'mechanic');

CREATE TABLE IF NOT EXISTS public.mechanic_task_messages (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid    NOT NULL REFERENCES public.vehicle_maintenance_tasks (id) ON DELETE CASCADE,
  quote_id    uuid    REFERENCES public.mechanic_quotes (id) ON DELETE SET NULL,
  sender_id   uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  sender_role public.message_sender_role NOT NULL,
  body        text    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mechanic_task_messages_task_idx ON public.mechanic_task_messages (task_id, created_at);

-- ─── Widen vehicle_maintenance_tasks for public mechanic feed ─────────────────
-- The existing partial index is already correct (Phase 1). Add a composite one
-- for distance + specialty filtering.
CREATE INDEX IF NOT EXISTS vehicle_maintenance_tasks_public_listing_idx
  ON public.vehicle_maintenance_tasks (listing_id, priority, created_at DESC)
  WHERE is_public_to_mechanics = true AND status = 'open';

-- ─── published_open_tasks SECURITY DEFINER view ───────────────────────────────
-- Exposes only safe, sanitised columns of public tasks to mechanics.
-- Mirrors the published_listings pattern (see 00017_rls_optimization.sql).
DROP VIEW IF EXISTS public.published_open_tasks;

CREATE VIEW public.published_open_tasks
WITH (security_invoker = false)
AS
SELECT
  t.id,
  t.listing_id,
  t.kind,
  t.title,
  t.description,
  t.priority,
  t.due_at_date,
  t.due_at_miles,
  t.created_at,
  t.updated_at,
  l.lat  AS listing_lat,
  l.lng  AS listing_lng,
  l.location_label,
  l.address_city,
  l.address_state,
  l.vehicle_year,
  l.vehicle_make,
  l.vehicle_model,
  l.vehicle_class
FROM public.vehicle_maintenance_tasks t
JOIN public.listings l ON l.id = t.listing_id
WHERE t.is_public_to_mechanics = true
  AND t.status = 'open';

GRANT SELECT ON public.published_open_tasks TO anon, authenticated;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE public.mechanic_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_quotes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_task_messages ENABLE ROW LEVEL SECURITY;

-- mechanic_profiles: mechanic edits own row; any authenticated user reads active rows.
CREATE POLICY mechanic_profiles_own ON public.mechanic_profiles
  FOR ALL TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY mechanic_profiles_read_active ON public.mechanic_profiles
  FOR SELECT TO authenticated
  USING (is_active = true);

-- mechanic_quotes: mechanic owns quotes they sent; host reads/updates on their tasks.
CREATE POLICY mechanic_quotes_mechanic ON public.mechanic_quotes
  FOR ALL TO authenticated
  USING  (mechanic_id = auth.uid())
  WITH CHECK (mechanic_id = auth.uid());

CREATE POLICY mechanic_quotes_host_read ON public.mechanic_quotes
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY mechanic_quotes_host_update_status ON public.mechanic_quotes
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

-- mechanic_task_messages: both parties in the thread can read/write.
CREATE POLICY mechanic_messages_parties ON public.mechanic_task_messages
  FOR ALL TO authenticated
  USING (
    sender_id = auth.uid()
    OR task_id IN (
      SELECT id FROM public.vehicle_maintenance_tasks WHERE host_id = auth.uid()
    )
    OR task_id IN (
      SELECT task_id FROM public.mechanic_quotes WHERE mechanic_id = auth.uid()
    )
  )
  WITH CHECK (sender_id = auth.uid());

-- Widen vehicle_maintenance_tasks: mechanics may read public open tasks.
-- (Host's own-row policy was created in Phase 1.)
CREATE POLICY vehicle_maintenance_tasks_mechanic_read ON public.vehicle_maintenance_tasks
  FOR SELECT TO authenticated
  USING (is_public_to_mechanics = true AND status = 'open');
