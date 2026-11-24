-- ============================================================
-- Music App - Core Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── ARTISTS ───────────────────────────────────────────────
create table public.artists (
  id           uuid        default gen_random_uuid() primary key,
  name         text        not null,
  bio          text,
  image_url    text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  constraint artist_name_not_empty check (char_length(trim(name)) > 0)
);

create index idx_artists_name on public.artists using gin (name gin_trgm_ops);

create trigger trg_artists_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

-- ─── ALBUMS ────────────────────────────────────────────────
create table public.albums (
  id               uuid        default gen_random_uuid() primary key,
  title            text        not null,
  artist_id        uuid        references public.artists(id) on delete set null,
  cover_image_url  text,
  release_year     integer,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null,
  constraint album_title_not_empty  check (char_length(trim(title)) > 0),
  constraint album_year_valid       check (release_year is null or (release_year >= 1900 and release_year <= 2100))
);

create index idx_albums_artist_id   on public.albums(artist_id);
create index idx_albums_title       on public.albums using gin (title gin_trgm_ops);

create trigger trg_albums_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

-- ─── SONGS ─────────────────────────────────────────────────
-- The database is ALWAYS the source of truth for metadata.
-- The audio_url points to a file in Supabase Storage.
-- Embedded file metadata is extracted once on upload but then
-- discarded — all edits happen to this table, never the file.
create table public.songs (
  id               uuid        default gen_random_uuid() primary key,
  title            text        not null,
  artist_id        uuid        references public.artists(id) on delete set null,
  album_id         uuid        references public.albums(id)  on delete set null,
  duration         integer,            -- seconds; null until extracted
  genre            text,
  release_year     integer,
  audio_url        text        not null,
  cover_image_url  text,               -- overrides album art if set
  play_count       bigint      default 0 not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null,
  constraint song_title_not_empty   check (char_length(trim(title)) > 0),
  constraint song_duration_positive check (duration is null or duration > 0),
  constraint song_year_valid        check (release_year is null or (release_year >= 1900 and release_year <= 2100)),
  constraint song_play_count_gte_0  check (play_count >= 0)
);

create index idx_songs_artist_id   on public.songs(artist_id);
create index idx_songs_album_id    on public.songs(album_id);
create index idx_songs_genre       on public.songs(genre);
create index idx_songs_title       on public.songs using gin (title gin_trgm_ops);
create index idx_songs_created_at  on public.songs(created_at desc);

create trigger trg_songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ─── PLAYLISTS ─────────────────────────────────────────────
create table public.playlists (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users(id) on delete cascade not null,
  name             text        not null,
  description      text,
  cover_image_url  text,
  is_public        boolean     default false not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null,
  constraint playlist_name_length check (char_length(trim(name)) between 1 and 100)
);

create index idx_playlists_user_id  on public.playlists(user_id);
create index idx_playlists_public   on public.playlists(is_public) where is_public = true;

create trigger trg_playlists_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

-- ─── PLAYLIST SONGS ────────────────────────────────────────
create table public.playlist_songs (
  id           uuid        default gen_random_uuid() primary key,
  playlist_id  uuid        references public.playlists(id) on delete cascade not null,
  song_id      uuid        references public.songs(id)     on delete cascade not null,
  position     integer     not null default 0,
  added_at     timestamptz default now() not null,
  constraint unique_song_per_playlist unique (playlist_id, song_id),
  constraint position_non_negative    check (position >= 0)
);

create index idx_playlist_songs_playlist_id on public.playlist_songs(playlist_id);
create index idx_playlist_songs_position    on public.playlist_songs(playlist_id, position);
create index idx_playlist_songs_song_id     on public.playlist_songs(song_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.artists       enable row level security;
alter table public.albums        enable row level security;
alter table public.songs         enable row level security;
alter table public.playlists     enable row level security;
alter table public.playlist_songs enable row level security;

-- ─── ARTISTS: public read, admin write ─────────────────────
create policy "artists_select_public" on public.artists
  for select using (true);

create policy "artists_all_admin" on public.artists
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── ALBUMS: public read, admin write ──────────────────────
create policy "albums_select_public" on public.albums
  for select using (true);

create policy "albums_all_admin" on public.albums
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── SONGS: public read, admin write ───────────────────────
create policy "songs_select_public" on public.songs
  for select using (true);

create policy "songs_all_admin" on public.songs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── PLAYLISTS ──────────────────────────────────────────────
create policy "playlists_select" on public.playlists
  for select using (auth.uid() = user_id or is_public = true);

create policy "playlists_insert" on public.playlists
  for insert with check (auth.uid() = user_id);

create policy "playlists_update" on public.playlists
  for update using (auth.uid() = user_id);

create policy "playlists_delete" on public.playlists
  for delete using (auth.uid() = user_id);

-- ─── PLAYLIST SONGS ─────────────────────────────────────────
create policy "playlist_songs_select" on public.playlist_songs
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.user_id = auth.uid() or p.is_public = true)
    )
  );

create policy "playlist_songs_all_owner" on public.playlist_songs
  for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );
