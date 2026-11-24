import { supabase } from './supabase';
import type { Song } from '../types/music';

const SONGS_QUERY = `
  *,
  artist:artists(*),
  album:albums(*, artist:artists(*))
` as const;

/**
 * Fetch all songs, newest first.
 */
export const fetchSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_QUERY)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Song[]) ?? [];
};

/**
 * Fetch a single song by ID.
 */
export const fetchSongById = async (id: string): Promise<Song> => {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_QUERY)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Song;
};

/**
 * Fetch songs filtered by genre.
 */
export const fetchSongsByGenre = async (genre: string): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_QUERY)
    .eq('genre', genre)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Song[]) ?? [];
};

/**
 * Increment the play_count for a song (fire-and-forget).
 */
export const incrementPlayCount = async (id: string): Promise<void> => {
  await supabase.rpc('increment_play_count', { song_id: id });
};
