import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Plus, Globe, Lock, MoreVertical, X, Check, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useSongs } from '../hooks/useSongs';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { useMyPlaylists, usePublicPlaylists, useCreatePlaylist, useFavoriteSongs, useEnsureFavoritesPlaylist } from '../hooks/usePlaylists';
import { SongActionMenu } from '../components/common/SongActionMenu';
import { FavoriteButton } from '../components/common/FavoriteButton';
import { resolveCover } from '../utils/formatTime';
import { useQueryClient } from '@tanstack/react-query';
import type { Song, Playlist } from '../types/music';

// ─── Playlist Card ─────────────────────────────────────────────
const PlaylistCard: React.FC<{ playlist: Playlist }> = ({ playlist }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors text-left cursor-pointer"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0 border border-white/10 shadow-md flex items-center justify-center">
        {playlist.cover_image_url ? (
          <img src={playlist.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music2 className="h-6 w-6 text-purple-400/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{playlist.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-zinc-500 truncate">
            {playlist.is_public ? 'Public Playlist' : 'Private Playlist'}
          </span>
          {playlist.is_public ? (
            <Globe className="h-3 w-3 text-green-400/80 flex-shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-purple-400/80 flex-shrink-0" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MenuTrigger = React.memo(() => (
  <div className="p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
    <MoreVertical className="h-4 w-4" />
  </div>
));
MenuTrigger.displayName = 'MenuTrigger';

interface LibrarySongRowProps {
  song: Song;
  queue: Song[];
  index: number;
  currentSong: Song | null;
  isPlaying: boolean;
  playlists: Playlist[];
  onPlay: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  onPlayNext: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
}

const LibrarySongRow: React.FC<LibrarySongRowProps> = React.memo(({ song, queue, index, currentSong, isPlaying, playlists, onPlay, onTogglePlay, onPlayNext, onAddToQueue }) => {
  const isCurrent = currentSong?.id === song.id;
  const cover = resolveCover(song);

  const handleClick = useCallback(() => (isCurrent ? onTogglePlay() : onPlay(song, queue)), [isCurrent, onTogglePlay, onPlay, song, queue]);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors text-left"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 shadow-md">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="h-5 w-5 text-purple-400/40" />
          </div>
        )}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-[2px] items-end h-3.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[2px] bg-purple-400 rounded-full animate-pulse"
                  style={{ height: `${[55, 100, 70][i - 1]}%`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{song.artist?.name ?? 'Unknown'}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <FavoriteButton songId={song.id} size="sm" />
      </div>

      <SongActionMenu song={song} playlists={playlists} onPlayNext={onPlayNext} onAddToQueue={onAddToQueue}>
        <MenuTrigger />
      </SongActionMenu>
    </motion.button>
  );
});

LibrarySongRow.displayName = 'LibrarySongRow';

// ─── Library Page ─────────────────────────────────────────────
export const Library: React.FC = () => {
  const { user } = useAuth();
  const { data: songs = [], isLoading: songsLoading } = useSongs();
  const { data: myPlaylists = [], isLoading: myPlaylistsLoading } = useMyPlaylists(user?.id);
  const { data: publicPlaylists = [], } = usePublicPlaylists();
  const { data: favoriteSongs = [], isLoading: favoritesLoading } = useFavoriteSongs(user?.id);
  const { playSong, currentSong, isPlaying, togglePlay, playNext, addToQueue } = usePlayer();
  const queryClient = useQueryClient();

  const createPlaylistMutation = useCreatePlaylist(user?.id);
  const ensureFavoritesMutation = useEnsureFavoritesPlaylist(user?.id);

  // Ensure Favorites system playlist exists for existing users
  useEffect(() => {
    if (user?.id && myPlaylists.length > 0 && !myPlaylists.some(p => p.is_system)) {
      ensureFavoritesMutation.mutate();
    }
  }, [user?.id, myPlaylists, ensureFavoritesMutation]);

  const [tab, setTab] = useState<'tracks' | 'my_playlists' | 'public_playlists' | 'favorites'>('tracks');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Lock body scroll when create modal is open
  useEffect(() => {
    if (showCreateModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [showCreateModal]);

  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['songs'] }),
        queryClient.invalidateQueries({ queryKey: ['my_playlists', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['public_playlists'] }),
        queryClient.invalidateQueries({ queryKey: ['favorite_song_ids', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['favorite_songs', user?.id] }),
      ]);
    } catch (err: any) {
      setRefreshError(err.message || 'Failed to refresh library');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement)?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = e.target as HTMLElement;
    if (container.scrollTop === 0 && e.touches[0].clientY > touchStartY.current + 80) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const container = e.target as HTMLElement;
    if (container.scrollTop === 0 && e.changedTouches[0].clientY > touchStartY.current + 80) {
      await handleRefresh();
    }
  }, [handleRefresh]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError(null);
    setCoverFile(file);
  };

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylistMutation.mutateAsync({
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim() || undefined,
        isPublic: isPublic,
        coverFile: coverFile,
      });
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setCoverFile(null);
      setCoverError(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
      setShowCreateModal(false);
      setTab('my_playlists');
    } catch (err: any) {
      setCoverError(err.message || 'Failed to create playlist');
    }
  };

  const songRows = useMemo(() => {
    return songs.map((song, i) => (
      <LibrarySongRow
        key={song.id}
        song={song}
        queue={songs}
        index={i}
        currentSong={currentSong}
        isPlaying={isPlaying}
        playlists={myPlaylists}
        onPlay={playSong}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onAddToQueue={addToQueue}
      />
    ));
  }, [songs, currentSong, isPlaying, myPlaylists, playSong, togglePlay, playNext, addToQueue]);

  // Favorite songs as Library-style rows
  const favoriteRows = useMemo(() => {
    return favoriteSongs.map((song, i) => (
      <LibrarySongRow
        key={song.id}
        song={song}
        queue={favoriteSongs}
        index={i}
        currentSong={currentSong}
        isPlaying={isPlaying}
        playlists={myPlaylists}
        onPlay={playSong}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onAddToQueue={addToQueue}
      />
    ));
  }, [favoriteSongs, currentSong, isPlaying, myPlaylists, playSong, togglePlay, playNext, addToQueue]);

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl pt-safe">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold font-outfit text-white">Library</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Playlist
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 px-4 gap-6">
          <button
            onClick={() => setTab('tracks')}
            className={`pb-2.5 text-xs font-bold tracking-wide transition-colors relative ${
              tab === 'tracks' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            Tracks ({songs.length})
            {tab === 'tracks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
          </button>

          <button
            onClick={() => setTab('my_playlists')}
            className={`pb-2.5 text-xs font-bold tracking-wide transition-colors relative ${
              tab === 'my_playlists' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            My Playlists ({myPlaylists.filter(p => !p.is_system).length})
            {tab === 'my_playlists' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setTab('public_playlists')}
            className={`pb-2.5 text-xs font-bold tracking-wide transition-colors relative ${
              tab === 'public_playlists' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            Public Playlists ({publicPlaylists.length})
            {tab === 'public_playlists' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setTab('favorites')}
            className={`pb-2.5 text-xs font-bold tracking-wide transition-colors relative ${
              tab === 'favorites' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            Favorites ({favoriteSongs.length})
            {tab === 'favorites' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollContainerRef}
        className="pt-2"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isRefreshing && (
          <div className="flex items-center justify-center py-3 text-xs text-purple-400 font-semibold">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Refreshing library...
          </div>
        )}
        {refreshError && (
          <div className="flex items-center justify-center py-3 text-xs text-red-400 font-semibold">
            {refreshError}
          </div>
        )}
        {tab === 'tracks' && (
          <div>
            {songsLoading ? (
              <div className="px-4 py-2 divide-y divide-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-neutral-800 rounded w-2/3 mb-1.5" />
                      <div className="h-3 bg-neutral-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
                <Music2 className="h-10 w-10 text-zinc-600 mb-2" />
                <p className="text-white font-semibold">No songs found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/4">
                {songRows}
              </div>
            )}
          </div>
        )}

        {tab === 'my_playlists' && (
          <div>
            {myPlaylistsLoading ? (
              <div className="p-4 text-xs text-zinc-500">Loading playlists...</div>
            ) : myPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
                <Music2 className="h-10 w-10 text-zinc-600 mb-2" />
                <p className="text-white font-semibold mb-1">No playlists yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white font-bold rounded-full text-xs"
                >
                  Create First Playlist
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {myPlaylists.filter(p => !p.is_system).map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div>
            {favoritesLoading ? (
              <div className="px-4 py-2 divide-y divide-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-neutral-800 rounded w-2/3 mb-1.5" />
                      <div className="h-3 bg-neutral-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favoriteSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
                <Music2 className="h-10 w-10 text-zinc-600 mb-2" />
                <p className="text-white font-semibold">No favorite songs yet</p>
                <p className="text-sm text-zinc-500 mt-1">Tap the star on any song to add it here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/4">
                {favoriteRows}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <AnimatePresence>
          <motion.div
            key="create-playlist-backdrop"
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !createPlaylistMutation.isPending && setShowCreateModal(false)}
            onKeyDown={(e) => e.key === 'Escape' && !createPlaylistMutation.isPending && setShowCreateModal(false)}
            tabIndex={-1}
          >
            <motion.div
              key="create-playlist-modal"
              className="w-full max-w-lg bg-neutral-950/90 backdrop-blur-xl border border-white/8 rounded-3xl p-5 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <h3 className="text-base font-bold text-white">Create New Playlist</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cover Image Selector */}
              <div className="flex flex-col items-center mb-5">
                <div
                  onClick={() => !createPlaylistMutation.isPending && coverInputRef.current?.click()}
                  className="relative w-40 h-40 rounded-2xl bg-neutral-800 border-2 border-white/10 border-dashed flex items-center justify-center overflow-hidden mb-2 transition-colors"
                >
                  {coverFile ? (
                    <img
                      src={URL.createObjectURL(coverFile)}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Upload className="h-6 w-6 mb-1" />
                      <span className="text-xs">Choose Cover</span>
                    </div>
                  )}
                  {coverFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverFile(null);
                        setCoverError(null);
                        if (coverInputRef.current) coverInputRef.current.value = '';
                      }}
                      className="absolute top-1 right-1 bg-neutral-800/80 hover:bg-neutral-700 text-zinc-300 rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpg,image/jpeg,image/webp"
                  ref={coverInputRef}
                  onChange={handleCoverChange}
                  className="hidden"
                />
                <div className="text-[10px] text-zinc-500 text-center">
                  Tap to select or change cover image
                </div>
              </div>

              {coverError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-xs">
                  {coverError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  placeholder="My Awesome Mix"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Chill tracks for weekend vibes"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-800/60 rounded-xl border border-white/5 mb-5">
                <div>
                  <p className="text-xs font-bold text-white">Public Playlist</p>
                  <p className="text-[11px] text-zinc-500">Make playlist publicly visible to everyone</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={createPlaylistMutation.isPending || !newPlaylistName.trim()}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {createPlaylistMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Create Playlist
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Library;

