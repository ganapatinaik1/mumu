import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGetSongs, adminUpdateSong, adminDeleteSong, adminCreateSong,
  adminGetArtists, adminCreateArtist, adminUpdateArtist, adminDeleteArtist,
  adminGetAlbums, adminCreateAlbum, adminUpdateAlbum, adminDeleteAlbum,
} from '../services/admin';
import type { Song, Artist, Album } from '../types/music';

const KEYS = {
  songs: ['admin', 'songs'] as const,
  artists: ['admin', 'artists'] as const,
  albums: ['admin', 'albums'] as const,
};

export const useAdminSongs    = () => useQuery({ queryKey: KEYS.songs,   queryFn: adminGetSongs,   staleTime: 0 });
export const useAdminArtists  = () => useQuery({ queryKey: KEYS.artists, queryFn: adminGetArtists, staleTime: 0 });
export const useAdminAlbums   = () => useQuery({ queryKey: KEYS.albums,  queryFn: adminGetAlbums,  staleTime: 0 });

// ─── Song mutations ──────────────────────────────────────────
export const useCreateSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreateSong,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.songs });
      qc.invalidateQueries({ queryKey: ['songs'] });
    },
  });
};

export const useUpdateSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Song, 'title' | 'artist_id' | 'album_id' | 'duration' | 'genre' | 'release_year' | 'cover_image_url' | 'audio_url'>> }) =>
      adminUpdateSong(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.songs });
      qc.invalidateQueries({ queryKey: ['songs'] });
    },
  });
};

export const useDeleteSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDeleteSong,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.songs });
      qc.invalidateQueries({ queryKey: ['songs'] });
    },
  });
};

// ─── Artist mutations ─────────────────────────────────────────
export const useCreateArtist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreateArtist,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.artists }),
  });
};

export const useUpdateArtist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Artist, 'name' | 'bio' | 'image_url'>> }) =>
      adminUpdateArtist(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.artists }),
  });
};

export const useDeleteArtist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDeleteArtist,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.artists }),
  });
};

// ─── Album mutations ──────────────────────────────────────────
export const useCreateAlbum = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreateAlbum,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.albums }),
  });
};

export const useUpdateAlbum = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Album, 'title' | 'artist_id' | 'cover_image_url' | 'release_year'>> }) =>
      adminUpdateAlbum(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.albums }),
  });
};

export const useDeleteAlbum = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDeleteAlbum,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.albums }),
  });
};
