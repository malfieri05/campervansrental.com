-- Optional social-proof counter (was referenced by listing queries before this migration existed).
alter table public.listings
  add column if not exists view_count int not null default 0;
