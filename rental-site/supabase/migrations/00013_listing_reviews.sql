-- Listing reviews: one per confirmed reservation, within 48 hours of trip end.
-- Deadline rule: end_date::date + 2 days (exclusive), computed at UTC midnight.
-- This is mirrored exactly in lib/listing-reviews.ts for client eligibility checks.

create table if not exists public.listing_reviews (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings (id) on delete cascade,
  reservation_id   uuid not null unique references public.reservations (id) on delete cascade,
  author_id        uuid not null references public.profiles (id) on delete cascade,
  rating           smallint not null check (rating >= 1 and rating <= 5),
  body             text,
  check (char_length(body) <= 2000),
  created_at       timestamptz not null default now()
);

create index if not exists listing_reviews_listing_idx    on public.listing_reviews (listing_id);
create index if not exists listing_reviews_author_idx     on public.listing_reviews (author_id);

-- ── Aggregate refresh ───────────────────────────────────────────────────────
-- Runs after any INSERT/UPDATE/DELETE on listing_reviews; keeps listings.rating
-- and listings.review_count in sync without application-side round trips.
create or replace function public.refresh_listing_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_listing_id uuid;
begin
  -- On DELETE the OLD row carries the listing_id; on INSERT/UPDATE use NEW.
  target_listing_id := coalesce(NEW.listing_id, OLD.listing_id);

  update public.listings
  set
    review_count = (select count(*) from public.listing_reviews where listing_id = target_listing_id),
    rating       = (
      select
        case
          when count(*) = 0 then null
          else round(avg(rating)::numeric, 1)
        end
      from public.listing_reviews
      where listing_id = target_listing_id
    ),
    updated_at = now()
  where id = target_listing_id;

  return null;
end;
$$;

drop trigger if exists listing_reviews_refresh_aggregate on public.listing_reviews;
create trigger listing_reviews_refresh_aggregate
  after insert or update or delete on public.listing_reviews
  for each row execute function public.refresh_listing_rating();

-- ── Backfill + schema cleanup ────────────────────────────────────────────────
-- Remove the misleading default 4.9 so new listings start with rating = NULL.
alter table public.listings alter column rating drop default;

-- Zero-review listings should show NULL rating (not 4.9 placeholder).
update public.listings set rating = null where review_count = 0;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.listing_reviews enable row level security;

-- Public can read reviews on published listings.
create policy "listing_reviews_select_published"
  on public.listing_reviews for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'published'
    )
  );

-- Authors can read their own reviews even on unpublished listings (e.g. after delisting).
create policy "listing_reviews_select_own"
  on public.listing_reviews for select
  using (author_id = auth.uid());

-- Insert: must be the renter of a confirmed, completed reservation within the 48-hour window.
-- Deadline = end_date + 2 calendar days (UTC).  Window: end_date < today <= deadline.
create policy "listing_reviews_insert_eligible"
  on public.listing_reviews for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.reservations r
      where r.id       = reservation_id
        and r.renter_id  = auth.uid()
        and r.listing_id = listing_id
        and r.status     = 'confirmed'
        -- Trip must have ended (checkout day must be in the past)
        and current_date > r.end_date
        -- Must still be within the 48-hour review window
        and now() < (r.end_date::date + interval '2 days')
    )
  );

-- No UPDATE or DELETE for renters in v1 (immutable reviews).
-- Admins can manage via service_role key if needed.
