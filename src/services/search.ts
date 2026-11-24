import { supabase } from './supabase';
import type { SearchResults } from '../types/search';

export const search = async (query: string): Promise<SearchResults> => {
  const q = query.trim();
  if (!q) return { songs: [], artists: [], albums: [], users: [] };

  const pattern = `%${q}%`;

  const [songsRes, artistsRes, albumsRes, usersRes] = await Promise.all([
    supabase
      .from('songs')
      .select('*, artist:artists(*), album:albums(*, artist:artists(*))')
      .ilike('title', pattern)
      .limit(10),
    supabase
      .from('artists')
      .select('*')
      .ilike('name', pattern)
      .limit(10),
    supabase
      .from('albums')
      .select('*, artist:artists(*)')
      .ilike('title', pattern)
      .limit(10),
    supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(10),
  ]);

  if (songsRes.error)  throw new Error(songsRes.error.message);
  if (artistsRes.error) throw new Error(artistsRes.error.message);
  if (albumsRes.error) throw new Error(albumsRes.error.message);
  if (usersRes.error)  throw new Error(usersRes.error.message);

  return {
    songs:   songsRes.data   ?? [],
    artists: artistsRes.data ?? [],
    albums:  albumsRes.data  ?? [],
    users:   usersRes.data   ?? [],
  };
};
