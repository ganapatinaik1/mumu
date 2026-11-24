import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import {
  getMyPlaylists,
  getPlaylistById,
  createPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
  updatePlaylist,
  uploadPlaylistCover,
  getUserFavoriteSongIds,
  toggleFavorite,
  getFavoriteSongs,
  getUserFavoritesPlaylist,
  ensureFavoritesPlaylist,
} from '../services/playlists';

export const useMyPlaylists = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['my_playlists', userId],
    queryFn: () => (userId ? getMyPlaylists(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });
};

export const usePlaylistDetails = (playlistId: string | undefined) => {
  return useQuery({
    queryKey: ['playlist_details', playlistId],
    queryFn: () => (playlistId ? getPlaylistById(playlistId) : Promise.resolve(null)),
    enabled: Boolean(playlistId),
  });
};

export const useCreatePlaylist = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description, isPublic, coverFile }: { name: string; description?: string; isPublic?: boolean; coverFile?: File | null }) => {
      if (!userId) throw new Error('User not logged in');
      // 1. Create the playlist first (without cover)
      const playlist = await createPlaylist(userId, name, description, isPublic);
      // 2. Upload cover image if provided
      if (coverFile) {
        const coverUrl = await uploadPlaylistCover(coverFile, playlist.id);
        // 3. Update playlist with the cover URL
        await updatePlaylist(playlist.id, { cover_image_url: coverUrl });
        playlist.cover_image_url = coverUrl;
      }
      return playlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
    },
  });
};

export const useAddSongToPlaylist = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, songId }: { playlistId: string; songId: string }) =>
      addSongToPlaylist(playlistId, songId),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist_details', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
    },
  });
};

export const useRemoveSongFromPlaylist = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, songId }: { playlistId: string; songId: string }) =>
      removeSongFromPlaylist(playlistId, songId),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist_details', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
    },
  });
};

export const useDeletePlaylist = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
      queryClient.invalidateQueries({ queryKey: ['public_playlists'] });
    },
  });
};

export const usePublicPlaylists = () => {
  return useQuery({
    queryKey: ['public_playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};

export const useUpdatePlaylist = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      updates,
    }: {
      playlistId: string;
      updates: Partial<Pick<import('../types/music').Playlist, 'name' | 'description' | 'cover_image_url' | 'is_public'>>;
    }) => updatePlaylist(playlistId, updates),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist_details', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
      queryClient.invalidateQueries({ queryKey: ['public_playlists'] });
    },
  });
};

// ─── Favorites ─────────────────────────────────────────────────

export const useFavoriteSongIds = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['favorite_song_ids', userId],
    queryFn: () => (userId ? getUserFavoriteSongIds(userId) : Promise.resolve(new Set<string>())),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes — favorites don't change often
  });
};

export const useToggleFavorite = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ songId }: { songId: string }) => {
      if (!userId) throw new Error('User not logged in');
      return toggleFavorite(userId, songId);
    },
    // Optimistic update
    onMutate: async ({ songId }) => {
      await queryClient.cancelQueries({ queryKey: ['favorite_song_ids', userId] });

      const previous = queryClient.getQueryData<Set<string>>(['favorite_song_ids', userId]);

      if (previous) {
        if (previous.has(songId)) {
          previous.delete(songId);
        } else {
          previous.add(songId);
        }
        queryClient.setQueryData(['favorite_song_ids', userId], previous);
      }

      return { previous };
    },
    // Rollback on error
     onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorite_song_ids', userId], context.previous);
      }
    },
    // Refetch to confirm server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite_song_ids', userId] });
      queryClient.invalidateQueries({ queryKey: ['my_playlists', userId] });
    },
  });
};

export const useFavoriteSongs = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['favorite_songs', userId],
    queryFn: () => (userId ? getFavoriteSongs(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });
};

export const useFavoritesPlaylist = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['favorites_playlist', userId],
    queryFn: () => (userId ? getUserFavoritesPlaylist(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  });
};

export const useEnsureFavoritesPlaylist = (userId: string | undefined) => {
  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('User not logged in');
      return ensureFavoritesPlaylist(userId);
    },
  });
};
