-- ============================================================
-- Schema v2: Music Foundation + Social (Friends) System
-- Run AFTER schema.sql (auth/profiles already exist)
-- ============================================================

-- ─── ARTISTS ─────────────────────────────────────────────────
create table if not exists public.artists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  bio         text,
  image_url   text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.artists enable row level security;
create policy "artists_read_all"  on public.artists for select using (true);
create policy "artists_admin_all" on public.artists for all
  using ((select is_admin from public.profiles where id = auth.uid()));

-- ─── ALBUMS ──────────────────────────────────────────────────
create table if not exists public.albums (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  artist_id        uuid references public.artists(id) on delete set null,
  cover_image_url  text,
  release_year     int check (release_year between 1900 and 2100),
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

alter table public.albums enable row level security;
create policy "albums_read_all"  on public.albums for select using (true);
create policy "albums_admin_all" on public.albums for all
  using ((select is_admin from public.profiles where id = auth.uid()));

create index if not exists albums_artist_id_idx on public.albums(artist_id);

-- ─── SONGS ───────────────────────────────────────────────────
-- Database is always the source of truth. Audio metadata is
-- stored here independently from any embedded file metadata.
create table if not exists public.songs (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  artist_id        uuid references public.artists(id) on delete set null,
  album_id         uuid references public.albums(id)  on delete set null,
  duration         int,                        -- seconds
  genre            text,
  release_year     int check (release_year between 1900 and 2100),
  audio_url        text not null,
  cover_image_url  text,                       -- overrides album art
  play_count       bigint default 0 not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

alter table public.songs enable row level security;
create policy "songs_read_all"  on public.songs for select using (true);
create policy "songs_admin_all" on public.songs for all
  using ((select is_admin from public.profiles where id = auth.uid()));

create index if not exists songs_artist_id_idx  on public.songs(artist_id);
create index if not exists songs_album_id_idx   on public.songs(album_id);
create index if not exists songs_genre_idx      on public.songs(genre);
create index if not exists songs_created_at_idx on public.songs(created_at desc);

-- Helper RPC: increment play count (fire-and-forget safe)
create or replace function public.increment_play_count(song_id uuid)
returns void language sql security definer as $$
  update public.songs set play_count = play_count + 1 where id = song_id;
$$;

-- ─── PLAYLISTS ────────────────────────────────────────────────
create table if not exists public.playlists (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  name             text not null,
  description      text,
  cover_image_url  text,
  is_public        boolean default false not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

alter table public.playlists enable row level security;
create policy "playlists_read_public" on public.playlists for select
  using (is_public or auth.uid() = user_id);
create policy "playlists_owner_write" on public.playlists for all
  using (auth.uid() = user_id);

create index if not exists playlists_user_id_idx on public.playlists(user_id);

-- ─── PLAYLIST SONGS ──────────────────────────────────────────
create table if not exists public.playlist_songs (
  id           uuid primary key default gen_random_uuid(),
  playlist_id  uuid references public.playlists(id) on delete cascade not null,
  song_id      uuid references public.songs(id)     on delete cascade not null,
  position     int not null default 0,
  added_at     timestamptz default now() not null,
  unique(playlist_id, song_id)
);

alter table public.playlist_songs enable row level security;
create policy "playlist_songs_read" on public.playlist_songs for select
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.is_public or p.user_id = auth.uid())
    )
  );
create policy "playlist_songs_write" on public.playlist_songs for all
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

create index if not exists playlist_songs_playlist_idx  on public.playlist_songs(playlist_id, position);

-- ─── FRIENDS ─────────────────────────────────────────────────
-- status: 'pending' | 'accepted' | 'rejected'
-- requester_id sends request to addressee_id
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid references public.profiles(id) on delete cascade not null,
  addressee_id  uuid references public.profiles(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'rejected')),
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- Either party can see their own friendships
create policy "friendships_read_own" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only requester can create
create policy "friendships_insert_requester" on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Only addressee can update (accept/reject) or requester can cancel
create policy "friendships_update" on public.friendships for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- Either party can delete (cancel / unfriend)
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create index if not exists friendships_requester_idx  on public.friendships(requester_id);
create index if not exists friendships_addressee_idx  on public.friendships(addressee_id);
create index if not exists friendships_status_idx     on public.friendships(status);

-- ─── UPDATED_AT TRIGGER (reusable) ───────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger artists_updated_at   before update on public.artists   for each row execute procedure public.set_updated_at();
create or replace trigger albums_updated_at    before update on public.albums    for each row execute procedure public.set_updated_at();
create or replace trigger songs_updated_at     before update on public.songs     for each row execute procedure public.set_updated_at();
create or replace trigger playlists_updated_at before update on public.playlists for each row execute procedure public.set_updated_at();
create or replace trigger friendships_updated_at before update on public.friendships for each row execute procedure public.set_updated_at();

-- ─── STORAGE BUCKETS SETUP ───────────────────────────────────
insert into storage.buckets (id, name, public)
values 
  ('audio-files', 'audio-files', true),
  ('cover-art', 'cover-art', true),
  ('artist-images', 'artist-images', true)
on conflict (id) do nothing;

create policy "Public Access Storage" on storage.objects for select
  using (bucket_id in ('audio-files', 'cover-art', 'artist-images'));

create policy "Authenticated Upload Storage" on storage.objects for insert
  with check (bucket_id in ('audio-files', 'cover-art', 'artist-images') and auth.role() = 'authenticated');

-- ─── SYNC SESSIONS (Real-time Spotify Jam Sync) ─────────────────
create table if not exists public.sync_sessions (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid references public.profiles(id) on delete cascade not null,
  guest_id    uuid references public.profiles(id) on delete cascade not null,
  status      text check (status in ('pending', 'active', 'ended', 'declined')) default 'pending',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists idx_sync_sessions_host_id on public.sync_sessions(host_id);
create index if not exists idx_sync_sessions_guest_id on public.sync_sessions(guest_id);
create index if not exists idx_sync_sessions_status on public.sync_sessions(status);

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

create or replace trigger sync_sessions_updated_at before update on public.sync_sessions for each row execute procedure public.set_updated_at();

