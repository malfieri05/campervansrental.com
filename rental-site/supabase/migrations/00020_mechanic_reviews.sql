-- Phase 4 — Mechanic reviews + avg_rating aggregate trigger

-- ─── mechanic_reviews table ───────────────────────────────────────────────────
-- A host can leave one review per accepted+completed quote.

CREATE TABLE IF NOT EXISTS public.mechanic_reviews (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid    NOT NULL UNIQUE REFERENCES public.mechanic_quotes (id) ON DELETE CASCADE,
  mechanic_id uuid    NOT NULL REFERENCES public.mechanic_profiles (id) ON DELETE CASCADE,
  host_id     uuid    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating      int     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mechanic_reviews_mechanic_idx ON public.mechanic_reviews (mechanic_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.mechanic_reviews ENABLE ROW LEVEL SECURITY;

-- Host can insert/read their own reviews.
CREATE POLICY mechanic_reviews_host ON public.mechanic_reviews
  FOR ALL TO authenticated
  USING  (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Anyone authenticated can read reviews (for display on mechanic profile).
CREATE POLICY mechanic_reviews_public_read ON public.mechanic_reviews
  FOR SELECT TO authenticated
  USING (true);

-- ─── avg_rating trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_mechanic_avg_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_avg  numeric(3,2);
  new_count int;
BEGIN
  SELECT AVG(rating)::numeric(3,2), COUNT(*)
    INTO new_avg, new_count
    FROM public.mechanic_reviews
   WHERE mechanic_id = COALESCE(NEW.mechanic_id, OLD.mechanic_id);

  UPDATE public.mechanic_profiles
     SET avg_rating            = new_avg,
         quotes_accepted_count = new_count
   WHERE id = COALESCE(NEW.mechanic_id, OLD.mechanic_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER mechanic_reviews_avg_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.mechanic_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_mechanic_avg_rating();

-- ─── quote_new_count on mechanic_profiles ─────────────────────────────────────
-- Keep quotes_sent_count accurate via trigger.

CREATE OR REPLACE FUNCTION public.update_mechanic_quotes_sent_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.mechanic_profiles
       SET quotes_sent_count = quotes_sent_count + 1
     WHERE id = NEW.mechanic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mechanic_profiles
       SET quotes_sent_count = GREATEST(quotes_sent_count - 1, 0)
     WHERE id = OLD.mechanic_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER mechanic_quotes_sent_count_trigger
  AFTER INSERT OR DELETE ON public.mechanic_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_mechanic_quotes_sent_count();
