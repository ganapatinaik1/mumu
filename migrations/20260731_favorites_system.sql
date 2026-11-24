-- ============================================================
-- Favorites System Migration
-- Run AFTER schema_v2.sql
-- ============================================================

-- ─── Add is_system flag to playlists ─────────────────────────
-- System playlists (like "Favorites") cannot be deleted or renamed by users
alter table public.playlists add column if not exists is_system boolean default false not null;
create index if not exists playlists_is_system_idx on public.playlists(is_system);

-- ─── Favorites table (efficient per-user favorite tracking) ──
-- This provides O(log n) lookup for "is this song favorited?"
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  song_id    uuid references public.songs(id)     on delete cascade not null,
  position   int not null default 0,              -- ordering within the Favorites playlist
  added_at   timestamptz default now() not null,
  unique(user_id, song_id)
);

alter table public.favorites enable row level security;

-- Users can read their own favorites
create policy "favorites_read_own" on public.favorites for select
  using (auth.uid() = user_id);

-- Users can insert into their own favorites
create policy "favorites_insert_own" on public.favorites for insert
  with check (auth.uid() = user_id);

-- Users can delete from their own favorites
create policy "favorites_delete_own" on public.favorites for delete
  using (auth.uid() = user_id);

create index if not exists favorites_user_id_idx    on public.favorites(user_id);
create index if not exists favorites_song_id_idx    on public.favorites(song_id);
create index if not exists favorites_user_song_idx   on public.favorites(user_id, song_id);

-- ─── Auto-create Favorites system playlist on user signup ────
create or replace function public.create_favorites_playlist()
returns trigger language plpgsql as $$
begin
  insert into public.playlists (user_id, name, description, is_public, is_system, cover_image_url)
  values (new.id, 'Favorites', 'Your liked songs', false, true, null);
  return new;
end;
$$;

create or replace trigger on_profile_created_favorites
  after insert on public.profiles
  for each row execute procedure public.create_favorites_playlist();

-- ─── Sync favorites table ↔ playlist_songs ───────────────────
-- When a song is favorited, add it to the user's Favorites playlist.
-- When unfavorited, remove it from the playlist_songs table.
-- This keeps the Favorites playlist in sync with the favorites table.

create or replace function public.sync_favorites_to_playlist()
returns trigger language plpgsql as $$
declare
  fav_playlist_id uuid;
begin
  -- Get the user's Favorites system playlist
  select id into fav_playlist_id
  from public.playlists
  where user_id = NEW.user_id and is_system = true and name = 'Favorites'
  limit 1;

  if fav_playlist_id is not null then
    if (tg_op = 'INSERT') then
      -- Insert into playlist_songs (avoid duplicates)
      insert into public.playlist_songs (playlist_id, song_id, position)
      values (fav_playlist_id, NEW.song_id, NEW.position)
      on conflict (playlist_id, song_id) do nothing;
    elsif (tg_op = 'DELETE') then
      -- Remove from playlist_songs
      delete from public.playlist_songs
      where playlist_id = fav_playlist_id and song_id = OLD.song_id;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger favorites_sync_to_playlist
  after insert or delete on public.favorites
  for each row execute procedure public.sync_favorites_to_playlist();

-- ─── Prevent deletion / renaming of system playlists ─────────
create or replace function public.prevent_system_playlist_delete()
returns trigger language plpgsql as $$
begin
  if old.is_system then
    raise exception 'Cannot delete a system playlist';
  end if;
  return old;
end;
$$;

create trigger prevent_system_playlist_delete
  before delete on public.playlists
  for each row execute procedure public.prevent_system_playlist_delete();

create or replace function public.prevent_system_playlist_rename()
returns trigger language plpgsql as $$
begin
  if old.is_system and new.name != old.name then
    raise exception 'Cannot rename a system playlist';
  end if;
  return new;
end;
$$;

create trigger prevent_system_playlist_rename
  before update of name on public.playlists
  for each row execute procedure public.prevent_system_playlist_rename();

-- ─── Helper RPC: toggle favorite status ───────────────────────
create or replace function public.toggle_favorite(p_user_id uuid, p_song_id uuid)
returns boolean language plpgsql as $$
declare
  exists_record boolean;
  next_position int;
begin
  select true into exists_record
  from public.favorites
  where user_id = p_user_id and song_id = p_song_id;

  if exists_record then
    -- Remove from favorites
    delete from public.favorites
    where user_id = p_user_id and song_id = p_song_id;
    return false;
  else
    -- Add to favorites — get next position
    select coalesce(max(position), -1) + 1 into next_position
    from public.favorites
    where user_id = p_user_id;
    
    insert into public.favorites (user_id, song_id, position)
    values (p_user_id, p_song_id, next_position);
    return true;
  end if;
end;
$$;

-- ─── Helper RPC: check if a song is favorited ─────────────────
create or replace function public.is_favorited(p_user_id uuid, p_song_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.favorites
    where user_id = p_user_id and song_id = p_song_id
  );
$$;
