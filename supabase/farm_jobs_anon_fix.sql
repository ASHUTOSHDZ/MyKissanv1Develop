-- One-time fix if you already ran the older farm_jobs.sql with JWT-based RLS.
-- Run in Supabase SQL Editor, then restart your Vite dev server.

drop policy if exists "farm_jobs_select_visible" on public.farm_jobs;
drop policy if exists "farm_jobs_insert_farmer_only" on public.farm_jobs;
drop policy if exists "farm_jobs_update_owner" on public.farm_jobs;
drop policy if exists "farm_jobs_delete_owner" on public.farm_jobs;

alter table public.farm_jobs disable row level security;
