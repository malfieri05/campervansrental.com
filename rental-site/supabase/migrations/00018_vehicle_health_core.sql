-- Vehicle Health & Maintenance Hub — Phase 1 core schema
-- Creates five satellite tables for per-vehicle health tracking.
-- All tables FK to listings.id ON DELETE CASCADE.
-- host_id is denormalized on each table so RLS checks are O(1).

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE public.maintenance_kind AS ENUM (
  'oil_change',
  'tire_rotation',
  'brake_inspection',
  'transmission_fluid',
  'air_filter',
  'coolant_flush',
  'inspection',
  'custom'
);

CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE public.maintenance_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'deferred',
  'cancelled'
);

CREATE TYPE public.mileage_source AS ENUM ('platform', 'external_calendar', 'manual');

CREATE TYPE public.damage_severity AS ENUM ('minor', 'moderate', 'major', 'totaled');

CREATE TYPE public.damage_category AS ENUM (
  'exterior',
  'interior',
  'mechanical',
  'electrical',
  'tires',
  'glass',
  'other'
);

CREATE TYPE public.damage_repair_status AS ENUM (
  'unresolved',
  'in_progress',
  'repaired',
  'deferred'
);

-- ─── vehicle_profiles ────────────────────────────────────────────────────────
-- One row per listing (lazily created on first health-page visit).

CREATE TABLE IF NOT EXISTS public.vehicle_profiles (
  listing_id              uuid    PRIMARY KEY REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id                 uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  current_odometer_miles  int,
  current_odometer_updated_at timestamptz,
  purchased_at            date,
  vin_last_4              char(4),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_profiles_host_idx ON public.vehicle_profiles (host_id);

-- ─── vehicle_mileage_logs ─────────────────────────────────────────────────────
-- Append-only audit of each trip's odometer readings.

CREATE TABLE IF NOT EXISTS public.vehicle_mileage_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid        NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id             uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reservation_id      uuid        REFERENCES public.reservations (id) ON DELETE SET NULL,
  external_block_id   uuid        REFERENCES public.availability_blocks (id) ON DELETE SET NULL,
  source              public.mileage_source NOT NULL DEFAULT 'manual',
  start_odometer      int,
  end_odometer        int,
  miles_driven        int GENERATED ALWAYS AS (
    CASE
      WHEN start_odometer IS NOT NULL AND end_odometer IS NOT NULL
           AND end_odometer >= start_odometer
      THEN end_odometer - start_odometer
      ELSE NULL
    END
  ) STORED,
  trip_start_date     date,
  trip_end_date       date,
  recorded_by         uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_mileage_logs_listing_date_idx
  ON public.vehicle_mileage_logs (listing_id, trip_end_date DESC);
CREATE INDEX IF NOT EXISTS vehicle_mileage_logs_reservation_idx
  ON public.vehicle_mileage_logs (reservation_id)
  WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vehicle_mileage_logs_block_idx
  ON public.vehicle_mileage_logs (external_block_id)
  WHERE external_block_id IS NOT NULL;

-- ─── vehicle_maintenance_intervals ───────────────────────────────────────────
-- Recurring service schedules (seeded with smart defaults on first visit).

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_intervals (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            uuid    NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id               uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  kind                  public.maintenance_kind NOT NULL DEFAULT 'custom',
  label                 text    NOT NULL,
  every_miles           int,
  every_days            int,
  last_completed_miles  int,
  last_completed_at     timestamptz,
  enabled               boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_maintenance_intervals_listing_idx
  ON public.vehicle_maintenance_intervals (listing_id, enabled);

-- ─── vehicle_maintenance_tasks ────────────────────────────────────────────────
-- Individual to-do items, optionally spawned by an interval or a damage report.

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_tasks (
  id                        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                uuid    NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id                   uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  interval_id               uuid    REFERENCES public.vehicle_maintenance_intervals (id) ON DELETE SET NULL,
  kind                      public.maintenance_kind NOT NULL DEFAULT 'custom',
  title                     text    NOT NULL,
  description               text,
  priority                  public.maintenance_priority NOT NULL DEFAULT 'medium',
  status                    public.maintenance_status NOT NULL DEFAULT 'open',
  due_at_miles              int,
  due_at_date               date,
  completed_at              timestamptz,
  completed_at_miles        int,
  completed_cost_cents      int,
  mechanic_notes            text,
  is_public_to_mechanics    boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_maintenance_tasks_listing_status_idx
  ON public.vehicle_maintenance_tasks (listing_id, status, priority);

-- Partial index for the mechanic-facing public feed (Phase 3).
CREATE INDEX IF NOT EXISTS vehicle_maintenance_tasks_public_feed_idx
  ON public.vehicle_maintenance_tasks (listing_id, priority, created_at DESC)
  WHERE is_public_to_mechanics = true AND status = 'open';

-- ─── vehicle_damage_reports ───────────────────────────────────────────────────
-- Log of vehicle damages, optionally linked to a reservation or task.

CREATE TABLE IF NOT EXISTS public.vehicle_damage_reports (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid    NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  host_id         uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reservation_id  uuid    REFERENCES public.reservations (id) ON DELETE SET NULL,
  severity        public.damage_severity NOT NULL DEFAULT 'minor',
  category        public.damage_category NOT NULL DEFAULT 'other',
  title           text    NOT NULL,
  description     text,
  discovered_at   date    NOT NULL DEFAULT CURRENT_DATE,
  repair_cost_cents int,
  repair_status   public.damage_repair_status NOT NULL DEFAULT 'unresolved',
  photos          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  linked_task_id  uuid    REFERENCES public.vehicle_maintenance_tasks (id) ON DELETE SET NULL,
  created_by      uuid    REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_damage_reports_listing_idx
  ON public.vehicle_damage_reports (listing_id, repair_status, discovered_at DESC);

-- ─── TRIGGERS — updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_vehicle_profiles_updated_at
  BEFORE UPDATE ON public.vehicle_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_vehicle_maintenance_intervals_updated_at
  BEFORE UPDATE ON public.vehicle_maintenance_intervals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_vehicle_maintenance_tasks_updated_at
  BEFORE UPDATE ON public.vehicle_maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE public.vehicle_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_mileage_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_damage_reports        ENABLE ROW LEVEL SECURITY;

-- vehicle_profiles
CREATE POLICY vehicle_profiles_host_all ON public.vehicle_profiles
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- vehicle_mileage_logs
CREATE POLICY vehicle_mileage_logs_host_all ON public.vehicle_mileage_logs
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- vehicle_maintenance_intervals
CREATE POLICY vehicle_maintenance_intervals_host_all ON public.vehicle_maintenance_intervals
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- vehicle_maintenance_tasks — host full access; Phase 3 adds a mechanic-read policy
CREATE POLICY vehicle_maintenance_tasks_host_all ON public.vehicle_maintenance_tasks
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- vehicle_damage_reports
CREATE POLICY vehicle_damage_reports_host_all ON public.vehicle_damage_reports
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());
