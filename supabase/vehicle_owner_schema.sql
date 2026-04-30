-- Vehicle owner dashboard schema
-- Run this in Supabase SQL editor after production_schema.sql

create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

create table if not exists public.vehicle_owner_profiles (
  user_id text primary key,
  owner_name text not null default '',
  phone text not null default '',
  state text not null default '',
  district text not null default '',
  block text not null default '',
  village text not null default '',
  pincode text not null default '' check (pincode ~ '^[0-9]{6}$' or pincode = ''),
  gender text not null default 'prefer_not_to_say' check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  business_name text not null default '',
  bio text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_rental_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  owner_name text not null default '',
  owner_phone text not null default '',
  state text not null default '',
  district text not null default '',
  block text not null default '',
  village text not null default '',
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  owner_gender text not null default 'prefer_not_to_say' check (owner_gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  title text not null,
  use_case_label text,
  description text not null default '',
  listing_kind text not null check (listing_kind in ('vehicle', 'equipment', 'service')),
  billing_unit text not null check (billing_unit in ('minute', 'hour', 'day', 'acre', 'km')),
  rate_amount numeric(12,2) not null check (rate_amount > 0),
  image_url text,
  age_years integer check (age_years is null or age_years >= 0),
  working_percent integer check (working_percent is null or (working_percent >= 1 and working_percent <= 100)),
  max_rent_days integer check (max_rent_days is null or max_rent_days >= 1),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_item_ratings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.vehicle_rental_items(id) on delete cascade,
  farmer_user_id text not null,
  farmer_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  review text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, farmer_user_id)
);

alter table public.vehicle_rental_items
  add column if not exists use_case_label text;

alter table public.vehicle_owner_profiles
  add column if not exists village text not null default '';

alter table public.vehicle_owner_profiles
  add column if not exists gender text not null default 'prefer_not_to_say';

alter table public.vehicle_owner_profiles
  drop constraint if exists vehicle_owner_profiles_gender_check;

alter table public.vehicle_owner_profiles
  add constraint vehicle_owner_profiles_gender_check
  check (gender in ('male', 'female', 'other', 'prefer_not_to_say'));

alter table public.vehicle_rental_items
  add column if not exists village text not null default '';

alter table public.vehicle_rental_items
  add column if not exists owner_gender text not null default 'prefer_not_to_say';

alter table public.vehicle_rental_items
  drop constraint if exists vehicle_rental_items_owner_gender_check;

alter table public.vehicle_rental_items
  add constraint vehicle_rental_items_owner_gender_check
  check (owner_gender in ('male', 'female', 'other', 'prefer_not_to_say'));

alter table public.vehicle_rental_items
  drop constraint if exists vehicle_rental_items_billing_unit_check;

alter table public.vehicle_rental_items
  add constraint vehicle_rental_items_billing_unit_check
  check (billing_unit in ('minute', 'hour', 'day', 'acre', 'km'));

grant select, insert, update on public.vehicle_owner_profiles to anon, authenticated;
grant select, insert, update, delete on public.vehicle_rental_items to anon, authenticated;
grant select, insert, update, delete on public.vehicle_item_ratings to anon, authenticated;

create index if not exists vehicle_rental_items_owner_idx on public.vehicle_rental_items (owner_user_id);
create index if not exists vehicle_rental_items_pin_availability_idx on public.vehicle_rental_items (pincode, is_available);
create index if not exists vehicle_item_ratings_item_idx on public.vehicle_item_ratings (item_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicle_owner_profiles_set_updated_at on public.vehicle_owner_profiles;
create trigger vehicle_owner_profiles_set_updated_at
before update on public.vehicle_owner_profiles
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_rental_items_set_updated_at on public.vehicle_rental_items;
create trigger vehicle_rental_items_set_updated_at
before update on public.vehicle_rental_items
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_item_ratings_set_updated_at on public.vehicle_item_ratings;
create trigger vehicle_item_ratings_set_updated_at
before update on public.vehicle_item_ratings
for each row execute function public.set_updated_at();

alter table public.vehicle_owner_profiles enable row level security;
alter table public.vehicle_rental_items enable row level security;
alter table public.vehicle_item_ratings enable row level security;

drop policy if exists vehicle_owner_profiles_select_open on public.vehicle_owner_profiles;
drop policy if exists vehicle_owner_profiles_upsert_open on public.vehicle_owner_profiles;
drop policy if exists vehicle_owner_profiles_update_open on public.vehicle_owner_profiles;
drop policy if exists vehicle_rental_items_select_open on public.vehicle_rental_items;
drop policy if exists vehicle_rental_items_insert_open on public.vehicle_rental_items;
drop policy if exists vehicle_rental_items_update_open on public.vehicle_rental_items;
drop policy if exists vehicle_rental_items_delete_open on public.vehicle_rental_items;
drop policy if exists vehicle_item_ratings_select_open on public.vehicle_item_ratings;
drop policy if exists vehicle_item_ratings_insert_open on public.vehicle_item_ratings;
drop policy if exists vehicle_item_ratings_update_open on public.vehicle_item_ratings;
drop policy if exists vehicle_item_ratings_delete_open on public.vehicle_item_ratings;

create policy vehicle_owner_profiles_select_open
on public.vehicle_owner_profiles
for select
to anon, authenticated
using (true);

create policy vehicle_owner_profiles_upsert_open
on public.vehicle_owner_profiles
for insert
to anon, authenticated
with check (length(trim(user_id)) > 0);

create policy vehicle_owner_profiles_update_open
on public.vehicle_owner_profiles
for update
to anon, authenticated
using (true)
with check (length(trim(user_id)) > 0);

create policy vehicle_rental_items_select_open
on public.vehicle_rental_items
for select
to anon, authenticated
using (true);

create policy vehicle_rental_items_insert_open
on public.vehicle_rental_items
for insert
to anon, authenticated
with check (length(trim(owner_user_id)) > 0);

create policy vehicle_rental_items_update_open
on public.vehicle_rental_items
for update
to anon, authenticated
using (true)
with check (length(trim(owner_user_id)) > 0);

create policy vehicle_rental_items_delete_open
on public.vehicle_rental_items
for delete
to anon, authenticated
using (true);

create policy vehicle_item_ratings_select_open
on public.vehicle_item_ratings
for select
to anon, authenticated
using (true);

create policy vehicle_item_ratings_insert_open
on public.vehicle_item_ratings
for insert
to anon, authenticated
with check (length(trim(farmer_user_id)) > 0);

create policy vehicle_item_ratings_update_open
on public.vehicle_item_ratings
for update
to anon, authenticated
using (true)
with check (length(trim(farmer_user_id)) > 0);

create policy vehicle_item_ratings_delete_open
on public.vehicle_item_ratings
for delete
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vehicle_rental_items'
  ) then
    alter publication supabase_realtime add table public.vehicle_rental_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vehicle_item_ratings'
  ) then
    alter publication supabase_realtime add table public.vehicle_item_ratings;
  end if;
end
$$;
