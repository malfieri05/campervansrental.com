-- Add consent columns to profiles and update handle_new_user to persist them

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz null,
  add column if not exists marketing_email_opt_in boolean not null default false;

-- Replace function to also capture consent metadata written at sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    is_host,
    terms_accepted_at,
    marketing_email_opt_in
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    case
      when (new.raw_user_meta_data->>'terms_accepted') = 'true' then now()
      else null
    end,
    coalesce((new.raw_user_meta_data->>'marketing_email_opt_in') = 'true', false)
  );
  return new;
end;
$$;
