-- Worker profiles + availability for farmer discovery.
-- Safe to run multiple times.

create table if not exists public.worker_profiles (
  user_id text primary key,
  full_name text not null,
  phone text not null default '',
  state text not null default '',
  district text not null default '',
  block text not null default '',
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  skills text[] not null default '{}',
  min_cost_per_day integer not null check (min_cost_per_day >= 1),
  age integer check (age is null or (age >= 18 and age <= 100)),
  gender text not null check (gender in ('male', 'female', 'other')),
  available_from date,
  available_to date,
  is_online boolean not null default false,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_profiles_availability_check
    check (available_from is null or available_to is null or available_from <= available_to)
);

create index if not exists worker_profiles_pincode_idx on public.worker_profiles (pincode);
create index if not exists worker_profiles_online_idx on public.worker_profiles (is_online, pincode);
create index if not exists worker_profiles_cost_idx on public.worker_profiles (min_cost_per_day);
create index if not exists worker_profiles_skills_gin_idx on public.worker_profiles using gin (skills);

grant select, insert, update, delete on public.worker_profiles to anon, authenticated;

alter table public.worker_profiles enable row level security;

drop policy if exists worker_profiles_select_open on public.worker_profiles;
drop policy if exists worker_profiles_insert_open on public.worker_profiles;
drop policy if exists worker_profiles_update_open on public.worker_profiles;
drop policy if exists worker_profiles_delete_open on public.worker_profiles;

create policy worker_profiles_select_open
on public.worker_profiles
for select
to anon, authenticated
using (true);

create policy worker_profiles_insert_open
on public.worker_profiles
for insert
to anon, authenticated
with check (length(trim(user_id)) > 0);

create policy worker_profiles_update_open
on public.worker_profiles
for update
to anon, authenticated
using (true)
with check (length(trim(user_id)) > 0);

create policy worker_profiles_delete_open
on public.worker_profiles
for delete
to anon, authenticated
using (true);

drop trigger if exists worker_profiles_set_updated_at on public.worker_profiles;
create trigger worker_profiles_set_updated_at
before update on public.worker_profiles
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'worker_profiles'
  ) then
    alter publication supabase_realtime add table public.worker_profiles;
  end if;
end
$$;
