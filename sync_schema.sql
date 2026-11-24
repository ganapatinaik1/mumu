-- ============================================================
-- Sync Sessions Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

create table if not exists public.sync_sessions (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  guest_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'active', 'ended', 'declined')) default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_sync_sessions_host_id on public.sync_sessions(host_id);
create index if not exists idx_sync_sessions_guest_id on public.sync_sessions(guest_id);
create index if not exists idx_sync_sessions_status on public.sync_sessions(status);

-- RLS
alter table public.sync_sessions enable row level security;

drop policy if exists "sync_sessions_select" on public.sync_sessions;
create policy "sync_sessions_select" on public.sync_sessions
  for select using (auth.uid() = host_id or auth.uid() = guest_id);

drop policy if exists "sync_sessions_insert" on public.sync_sessions;
create policy "sync_sessions_insert" on public.sync_sessions
  for insert with check (auth.uid() = host_id or auth.uid() = guest_id);

drop policy if exists "sync_sessions_update" on public.sync_sessions;
create policy "sync_sessions_update" on public.sync_sessions
  for update using (auth.uid() = host_id or auth.uid() = guest_id);

