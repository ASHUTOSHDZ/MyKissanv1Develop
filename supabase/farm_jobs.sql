-- Run this in Supabase SQL Editor (Dashboard → SQL → New query).
-- This app uses the Supabase ANON key from the browser (no Clerk JWT on Supabase).
-- Table security: RLS is OFF so anon can read/write. Anyone with your anon key can hit REST;
-- for production, add Edge Functions + service role or Clerk JWT + strict RLS instead.

create extension if not exists "pgcrypto";

create table if not exists public.farm_jobs (
  id uuid primary key default gen_random_uuid(),
  farmer_user_id text not null,
  farmer_name text not null,
  farmer_phone text not null default '',
  pincode text not null,
  district text not null,
  state text not null,
  block text not null,
  farming_type text not null,
  farming_type_other text not null default '',
  job_role text not null,
  job_role_other text not null default '',
  workers_needed integer not null check (workers_needed >= 1),
  location text not null,
  duration text not null,
  duration_other text not null default '',
  min_wage_per_day integer not null check (min_wage_per_day >= 1),
  food_provided boolean not null default false,
  transport_provided boolean not null default false,
  extra_requirements text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farm_jobs_pincode_idx on public.farm_jobs (pincode);
create index if not exists farm_jobs_farmer_user_id_idx on public.farm_jobs (farmer_user_id);
create index if not exists farm_jobs_created_at_idx on public.farm_jobs (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists farm_jobs_set_updated_at on public.farm_jobs;
create trigger farm_jobs_set_updated_at
before update on public.farm_jobs
for each row execute function public.set_updated_at();

-- Remove JWT-era policies if you re-run this file after an older version.
drop policy if exists "farm_jobs_select_visible" on public.farm_jobs;
drop policy if exists "farm_jobs_insert_farmer_only" on public.farm_jobs;
drop policy if exists "farm_jobs_update_owner" on public.farm_jobs;
drop policy if exists "farm_jobs_delete_owner" on public.farm_jobs;

alter table public.farm_jobs disable row level security;

-- Live updates (optional): Dashboard → Database → Replication → enable `farm_jobs`, or:
--   alter publication supabase_realtime add table public.farm_jobs;
