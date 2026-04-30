-- Run once if `farm_jobs` already existed without `farmer_phone` (Supabase SQL editor).

alter table public.farm_jobs
  add column if not exists farmer_phone text not null default '';
