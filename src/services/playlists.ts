import { supabase } from './supabase';
import type { Playlist, Song } from '../types/music';

export interface PlaylistWithSongs extends Playlist {
  songs: Song[];
}

export const getMyPlaylists = async (userId: string): Promise<Playlist[]> => {
  const { data, error } = await supabase
    .from('playlists')
    .select(`*, song_count:playlist_songs(count)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Map song_count from count object to a simple number on each playlist
  return (data ?? []).map((p: any) => ({
    ...p,
    song_count: p.song_count?.[0]?.count ?? 0,
  }));
};

export const getPlaylistById = async (playlistId: string): Promise<PlaylistWithSongs> => {
  const { data: playlist, error: playlistErr } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single();

  if (playlistErr) throw new Error(playlistErr.message);

  const { data: playlistSongs, error: songsErr } = await supabase
    .from('playlist_songs')
    .select('position, song:songs(*, artist:artists(*), album:albums(*))')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (songsErr) throw new Error(songsErr.message);

  const songs = (playlistSongs ?? [])
    .map((ps: any) => ps.song as Song)
    .filter(Boolean);

  return {
    ...playlist,
    songs,
  };
};

export const createPlaylist = async (
  userId: string,
  name: string,
  description?: string,
  isPublic = false
): Promise<Playlist> => {
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const addSongToPlaylist = async (playlistId: string, songId: string): Promise<void> => {
  // Get current max position
  const { data: existing } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from('playlist_songs').insert({
    playlist_id: playlistId,
    song_id: songId,
    position: nextPos,
  });

  if (error && !error.message.includes('unique constraint')) {
    throw new Error(error.message);
  }
};

export const removeSongFromPlaylist = async (playlistId: string, songId: string): Promise<void> => {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);

  if (error) throw new Error(error.message);
};

export const deletePlaylist = async (playlistId: string): Promise<void> => {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw new Error(error.message);
};

export const uploadPlaylistCover = async (file: Blob, playlistId: string): Promise<string> => {
  const fileName = `playlists/${Date.now()}-${playlistId.substring(0, 8)}.jpg`;

  const { error } = await supabase.storage
    .from('cover-art')
    .upload(fileName, file, { contentType: file.type || 'image/jpeg', upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('cover-art').getPublicUrl(fileName);
  return data.publicUrl;
};

export const updatePlaylist = async (
  playlistId: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover_image_url' | 'is_public'>>
): Promise<Playlist> => {
  const { data, error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', playlistId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── Favorites ─────────────────────────────────────────────────

export const getUserFavoriteSongIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('favorites')
    .select('song_id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((f: { song_id: string }) => f.song_id));
};

export const toggleFavorite = async (userId: string, songId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('toggle_favorite', {
    p_user_id: userId,
    p_song_id: songId,
  });

  if (error) throw new Error(error.message);
  return data as boolean;
};

export const getFavoriteSongs = async (userId: string): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('favorites')
    .select('song:songs(*, artist:artists(*), album:albums(*)), added_at')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((f: any) => f.song as Song)
    .filter(Boolean);
};

export const getUserFavoritesPlaylist = async (userId: string): Promise<Playlist | null> => {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_system', true)
    .eq('name', 'Favorites')
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data ?? null;
};

export const ensureFavoritesPlaylist = async (userId: string): Promise<string | null> => {
  // Check if Favorites playlist already exists
  const existing = await getUserFavoritesPlaylist(userId);
  if (existing) return existing.id;

  // Create it if it doesn't
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: userId,
      name: 'Favorites',
      description: 'Your liked songs',
      is_public: false,
      is_system: true,
      cover_image_url: null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
};
