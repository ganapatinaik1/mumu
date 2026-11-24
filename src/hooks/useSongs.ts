import { useQuery } from '@tanstack/react-query';
import { fetchSongs, fetchSongById } from '../services/songs';

export const SONGS_QUERY_KEY = ['songs'] as const;

/**
 * Fetch all songs with artist and album data.
 * Results are cached for 5 minutes via TanStack Query.
 */
export const useSongs = () =>
  useQuery({
    queryKey: SONGS_QUERY_KEY,
    queryFn: fetchSongs,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

/**
 * Fetch a single song by ID.
 */
export const useSong = (id: string) =>
  useQuery({
    queryKey: [...SONGS_QUERY_KEY, id],
    queryFn: () => fetchSongById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
