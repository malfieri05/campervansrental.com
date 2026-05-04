-- Optional host-provided pickup / drop-off rules (text and/or uploaded doc)

alter table public.listings
  add column if not exists pickup_dropoff_rules_text text,
  add column if not exists pickup_dropoff_rules_doc_url text;

comment on column public.listings.pickup_dropoff_rules_text is 'Optional plain-text pickup & return instructions shown on public listing';
comment on column public.listings.pickup_dropoff_rules_doc_url is 'Optional URL to uploaded rules PDF/doc (public storage)';
