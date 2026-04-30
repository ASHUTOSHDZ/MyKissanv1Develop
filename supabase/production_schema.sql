-- MyKissan schema for ANON browser client mode.
-- Works with only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
-- IMPORTANT: ownership cannot be cryptographically enforced from browser-only anon traffic.
-- For strict production ownership, move write operations to Supabase Edge Functions (service role).

create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

-- ---------------------------
-- profiles
-- ---------------------------
create table if not exists public.profiles (
  user_id text primary key,
  role text not null check (role in ('farmer', 'worker', 'vendor', 'vehicle_owner')),
  "fullName" text not null default '',
  phone text not null default '',
  state text not null default '',
  district text not null default '',
  block text not null default '',
  village text,
  pincode text not null default '' check (pincode ~ '^[0-9]{6}$' or pincode = ''),
  crops text[] not null default '{}',
  "farmSize" text,
  "mainCrop" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to anon, authenticated;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_pincode_idx on public.profiles (pincode);

-- ---------------------------
-- farm_jobs
-- ---------------------------
create table if not exists public.farm_jobs (
  id uuid primary key default gen_random_uuid(),
  farmer_user_id text not null,
  farmer_name text not null,
  farmer_phone text not null default '',
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  district text not null,
  state text not null,
  block text not null,
  farming_type text not null,
  farming_type_other text not null default '',
  job_role text not null,
  job_role_other text not null default '',
  workers_needed integer not null check (workers_needed >= 1 and workers_needed <= 500),
  location text not null,
  duration text not null,
  duration_other text not null default '',
  min_wage_per_day integer not null check (min_wage_per_day >= 1),
  food_provided boolean not null default false,
  transport_provided boolean not null default false,
  extra_requirements text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.farm_jobs to anon, authenticated;

create index if not exists farm_jobs_pincode_idx on public.farm_jobs (pincode);
create index if not exists farm_jobs_farmer_user_id_idx on public.farm_jobs (farmer_user_id);
create index if not exists farm_jobs_created_at_idx on public.farm_jobs (created_at desc);
create index if not exists farm_jobs_active_created_idx on public.farm_jobs (is_active, created_at desc);

-- ---------------------------
-- shared trigger function
-- ---------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists farm_jobs_set_updated_at on public.farm_jobs;
create trigger farm_jobs_set_updated_at
before update on public.farm_jobs
for each row execute function public.set_updated_at();

-- ---------------------------
-- RLS (anon-compatible)
-- ---------------------------
alter table public.profiles enable row level security;
alter table public.farm_jobs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_select_open on public.profiles;
drop policy if exists profiles_upsert_open on public.profiles;

create policy profiles_select_open
on public.profiles
for select
to anon, authenticated
using (true);

create policy profiles_upsert_open
on public.profiles
for insert
to anon, authenticated
with check (length(trim(user_id)) > 0);

drop policy if exists profiles_update_open on public.profiles;
create policy profiles_update_open
on public.profiles
for update
to anon, authenticated
using (true)
with check (length(trim(user_id)) > 0);

drop policy if exists farm_jobs_select_authenticated on public.farm_jobs;
drop policy if exists farm_jobs_insert_owner on public.farm_jobs;
drop policy if exists farm_jobs_update_owner on public.farm_jobs;
drop policy if exists farm_jobs_delete_owner on public.farm_jobs;
drop policy if exists farm_jobs_select_open on public.farm_jobs;
drop policy if exists farm_jobs_insert_open on public.farm_jobs;
drop policy if exists farm_jobs_update_open on public.farm_jobs;
drop policy if exists farm_jobs_delete_open on public.farm_jobs;

create policy farm_jobs_select_open
on public.farm_jobs
for select
to anon, authenticated
using (is_active = true);

create policy farm_jobs_insert_open
on public.farm_jobs
for insert
to anon, authenticated
with check (length(trim(farmer_user_id)) > 0);

create policy farm_jobs_update_open
on public.farm_jobs
for update
to anon, authenticated
using (true)
with check (length(trim(farmer_user_id)) > 0);

create policy farm_jobs_delete_open
on public.farm_jobs
for delete
to anon, authenticated
using (true);

-- Realtime stream for worker/farmer dashboards.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'farm_jobs'
  ) then
    alter publication supabase_realtime add table public.farm_jobs;
  end if;
end
$$;
