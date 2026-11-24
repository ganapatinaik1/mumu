import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListPlus, Music2, SkipForward } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAddSongToPlaylist } from '../../hooks/usePlaylists';
import { resolveCover } from '../../utils/formatTime';
import type { Song, Playlist } from '../../types/music';

interface SongActionMenuProps {
  song: Song;
  children: React.ReactNode;
  playlists: Playlist[];
  onPlayNext: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
}

export const SongActionMenu: React.FC<SongActionMenuProps> = React.memo(({ song, children, playlists, onPlayNext, onAddToQueue }) => {
  const { user } = useAuth();
  const addSongMutation = useAddSongToPlaylist(user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylistSelect, setShowPlaylistSelect] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handlePlayNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayNext(song);
    setIsOpen(false);
    showToast(`" ${song.title} " queued to play next`);
  }, [onPlayNext, song, showToast]);

  const handleAddToQueue = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToQueue(song);
    setIsOpen(false);
    showToast(`Added to queue`);
  }, [onAddToQueue, song, showToast]);

  const handleAddToPlaylist = useCallback((playlistId: string, playlistName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addSongMutation.mutate(
      { playlistId, songId: song.id },
      {
        onSuccess: () => {
          setShowPlaylistSelect(false);
          setIsOpen(false);
          showToast(`Added to "${playlistName}"`);
        },
      }
    );
  }, [addSongMutation, song.id, showToast]);

  const cover = useMemo(() => resolveCover(song), [song]);

  return (
    <div className="relative inline-block">
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>{children}</div>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <div className="flex-1 max-w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="w-full bg-neutral-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 overflow-hidden shadow-2xl"
              >
                {/* Song Header */}
                <div className="flex items-center gap-3 pb-4 mb-2 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="h-5 w-5 text-purple-400/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{song.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{song.artist?.name ?? 'Unknown Artist'}</p>
                  </div>
                </div>

                {!showPlaylistSelect ? (
                  /* Action Options */
                  <div className="space-y-1">
                    <button
                      onClick={handlePlayNext}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-white hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <SkipForward className="h-5 w-5 text-purple-400" />
                      Play Next
                    </button>

                    <button
                      onClick={handleAddToQueue}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-white hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <ListPlus className="h-5 w-5 text-purple-400" />
                      Add to Queue
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPlaylistSelect(true); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-white hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <Music2 className="h-5 w-5 text-purple-400" />
                      Add to Playlist
                    </button>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-full mt-2 py-3 rounded-xl text-center text-xs font-bold text-zinc-500 hover:text-white bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Playlist Picker */
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-2">
                      <p className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Select Playlist</p>
                      <button
                        onClick={() => setShowPlaylistSelect(false)}
                        className="text-xs text-purple-400 font-bold"
                      >
                        Back
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {playlists.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4 text-center">No playlists created yet.</p>
                      ) : (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={(e) => handleAddToPlaylist(pl.id, pl.name, e)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 border border-white/5">
                              {pl.cover_image_url ? (
                                <img src={pl.cover_image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Music2 className="h-4 w-4 text-purple-400/50" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                              <p className="text-[10px] text-zinc-500">{pl.is_public ? 'Public' : 'Private'}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

SongActionMenu.displayName = 'SongActionMenu';
