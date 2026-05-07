-- Host must accept paid requests before reservations become confirmed.

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (
    status in ('pending_payment', 'pending_host', 'confirmed', 'cancelled')
  );
