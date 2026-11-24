import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal, ListPlus, Music2, Plus, Check, Loader2, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMyPlaylists, useAddSongToPlaylist } from '../../hooks/usePlaylists';
import { createPlaylist } from '../../services/playlists';
import { resolveCover } from '../../utils/formatTime';
import type { Song, Playlist } from '../../types/music';

interface OverflowMenuProps {
  song: Song;
}

// Helper: find if song is already in a playlist
const isSongInPlaylist = (songId: string, playlist: Playlist): boolean => {
  if (!playlist.songs) return false;
  return playlist.songs.some((s) => s.id === songId);
};

export const OverflowMenu: React.FC<OverflowMenuProps> = ({ song }) => {
  const { user } = useAuth();
  const { data: playlists = [] } = useMyPlaylists(user?.id);
  // Filter out system playlists (Favorites) from the "Add to Playlist" list
  const userPlaylists = playlists.filter((p) => !p.is_system);

  const addSongMutation = useAddSongToPlaylist(user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [showNewName, setShowNewName] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastRef = useRef<string | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      if (submenuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
      setShowSubmenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSubmenu) setShowSubmenu(false);
        else setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, showSubmenu]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    // Check if already in playlist
    const playlist = userPlaylists.find((p) => p.id === playlistId);
    if (playlist && isSongInPlaylist(song.id, playlist)) {
      showToast('Already in playlist');
      closeAll();
      return;
    }

    try {
      await addSongMutation.mutateAsync({ playlistId, songId: song.id });
      showToast(`Added to '${playlistName}'`);
      closeAll();
    } catch (e: any) {
      if (e.message?.includes('unique constraint') || e.message?.includes('duplicate')) {
        showToast('Already in playlist');
        closeAll();
      } else {
        showToast('Failed to add song');
        closeAll();
      }
    }
  };

  const handleNewPlaylist = async () => {
    if (!user?.id) {
      showToast('Not logged in');
      return;
    }
    if (!newPlaylistName.trim()) {
      showToast('Enter a name first');
      return;
    }
    setCreating(true);
    try {
      const newPl = await createPlaylist(user.id, newPlaylistName.trim(), '', false);
      await addSongMutation.mutateAsync({ playlistId: newPl.id, songId: song.id });
      showToast(`Added to '${newPl.name}'`);
      closeAll();
      setNewPlaylistName('');
    } catch (e: any) {
      showToast(e.message || 'Failed to create playlist');
      closeAll();
    } finally {
      setCreating(false);
    }
  };

  const showToast = (msg: string) => {
    toastRef.current = msg;
    // Simple toast via alert-like div
    const el = document.createElement('div');
    el.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl pointer-events-none';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      document.body.removeChild(el);
    }, 2000);
  };

  const closeAll = () => {
    setIsOpen(false);
    setShowSubmenu(false);
    setShowNewName(false);
    setNewPlaylistName('');
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setShowSubmenu(false);
    } else {
      setIsOpen(true);
    }
  };

  const openSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubmenu(true);
  };

  const closeSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubmenu(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 active:scale-90 transition-transform"
        type="button"
      >
        <MoreHorizontal className="h-5 w-5 text-white/70" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Main menu */}
            <motion.div
              ref={menuRef}
              className="fixed z-[100] w-56 max-w-[calc(100vw-32px)] bg-neutral-900/95 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl py-1"
              style={{
                position: 'fixed',
                top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
                right: 16,
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <button
                onClick={openSubmenu}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/5 transition-colors"
              >
                <ListPlus className="h-4 w-4 text-purple-400" />
                Add to Playlist
              </button>
            </motion.div>

            {/* Submenu for "Add to Playlist" */}
            {showSubmenu && (
              <motion.div
                ref={submenuRef}
                className="fixed z-[100] w-56 max-w-[calc(100vw-32px)] bg-neutral-900/95 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl py-2"
                style={{
                  position: 'fixed',
                  top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
                  right: 200,
                }}
                initial={{ opacity: 0, scale: 0.95, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {/* New Playlist Header */}
                {showNewName ? (
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNewPlaylist();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowNewName(false);
                          setNewPlaylistName('');
                        }
                      }}
                      placeholder="Playlist name"
                      className="flex-1 px-2 py-1 bg-neutral-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/60"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNewPlaylist();
                      }}
                      disabled={creating}
                      className="p-1.5 text-purple-400 hover:text-white active:scale-90 transition-transform disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewName(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/5 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-purple-400" />
                    New Playlist
                  </button>
                )}

                {/* Existing playlists */}
                <div className="max-h-64 overflow-y-auto pt-1">
                  {userPlaylists.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-zinc-500">No playlists yet</div>
                  ) : (
                    userPlaylists.map((pl) => {
                      const alreadyFavorited = isSongInPlaylist(song.id, pl);
                      const cover = pl.cover_image_url ?? (pl.songs?.[0] ? resolveCover(pl.songs[0]) : null);
                      return (
                        <button
                          key={pl.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToPlaylist(pl.id, pl.name);
                          }}
                          disabled={addSongMutation.isPending}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-white/5">
                            {cover ? (
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className="h-4 w-4 text-purple-400/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                            {pl.song_count !== undefined && (
                              <p className="text-xs text-zinc-500 truncate">{pl.song_count} songs</p>
                            )}
                          </div>
                          {alreadyFavorited && (
                            <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Close arrow back to main menu */}
                <div className="border-t border-white/5 pt-1 mt-1">
                  <button
                    onClick={closeSubmenu}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-zinc-400 hover:bg-white/5 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
