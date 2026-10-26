-- whatsForDinner MVP schema
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Uses browser-safe publishable/anon key with Row Level Security. Never expose service_role keys.

create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  photo_url text,
  ingredients text not null default '',
  instructions text not null default '',
  cook_minutes integer check (cook_minutes is null or cook_minutes >= 0),
  cost_rating smallint check (cost_rating is null or cost_rating between 1 and 5),
  healthfulness_rating smallint check (healthfulness_rating is null or healthfulness_rating between 1 and 5),
  deliciousness_rating smallint check (deliciousness_rating is null or deliciousness_rating between 1 and 5),
  is_to_try boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  -- JSON object: {"YYYY-MM-DD": "recipe-uuid"}
  menu jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.recipes enable row level security;
alter table public.weekly_menus enable row level security;

drop policy if exists "Users can view their own recipes" on public.recipes;
create policy "Users can view their own recipes" on public.recipes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own recipes" on public.recipes;
create policy "Users can create their own recipes" on public.recipes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own recipes" on public.recipes;
create policy "Users can update their own recipes" on public.recipes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own recipes" on public.recipes;
create policy "Users can delete their own recipes" on public.recipes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view their own weekly menus" on public.weekly_menus;
create policy "Users can view their own weekly menus" on public.weekly_menus
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own weekly menus" on public.weekly_menus;
create policy "Users can create their own weekly menus" on public.weekly_menus
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own weekly menus" on public.weekly_menus;
create policy "Users can update their own weekly menus" on public.weekly_menus
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own weekly menus" on public.weekly_menus;
create policy "Users can delete their own weekly menus" on public.weekly_menus
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists recipes_user_created_idx on public.recipes(user_id, created_at desc);
create index if not exists weekly_menus_user_week_idx on public.weekly_menus(user_id, week_start desc);
