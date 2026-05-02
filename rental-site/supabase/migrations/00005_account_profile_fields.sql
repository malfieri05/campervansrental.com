-- Migration: Extended profile fields + profile-images storage bucket
-- Run in Supabase Dashboard → SQL Editor, or: npx supabase db push

-- ─── Profile fields ────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists first_name      text,
  add column if not exists last_name       text,
  add column if not exists phone           text,
  add column if not exists about_me        text,
  add column if not exists address_street  text,
  add column if not exists address_city    text,
  add column if not exists address_state   text,
  add column if not exists address_zip     text,
  add column if not exists address_country text not null default 'US',
  add column if not exists avatar_url      text;

-- ─── Storage bucket for profile images ────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar (path: <uid>/avatar.*)
create policy "profile_images_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'profile-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is already public, but explicit policy is required when RLS is on)
create policy "profile_images_select_public"
  on storage.objects for select
  using (bucket_id = 'profile-images');
