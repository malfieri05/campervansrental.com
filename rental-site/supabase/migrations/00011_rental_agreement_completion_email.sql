-- Idempotent packet emails: track each recipient separately so a partial failure can retry safely.
alter table public.rental_agreement_submissions
  add column if not exists packet_email_renter_sent_at timestamptz;

alter table public.rental_agreement_submissions
  add column if not exists packet_email_host_sent_at timestamptz;
