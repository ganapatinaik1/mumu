import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, Music2, Globe, Lock, Edit3, Trash2,
  X, Check, Loader2, Upload, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useMyPlaylists, usePlaylistDetails, useUpdatePlaylist, useDeletePlaylist, useRemoveSongFromPlaylist, } from '../hooks/usePlaylists';
import { uploadPlaylistCover } from '../services/playlists';
import { resolveCover, formatDuration } from '../utils/formatTime';
import { SongActionMenu } from '../components/common/SongActionMenu';
import { FavoriteButton } from '../components/common/FavoriteButton';

export const PlaylistDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong, playQueue, currentSong, isPlaying, togglePlay, playNext, addToQueue } = usePlayer();
  const { data: playlists = [] } = useMyPlaylists(user?.id);

  const { data: playlist, isLoading } = usePlaylistDetails(id);
  const updatePlaylist = useUpdatePlaylist(user?.id);
  const deletePlaylist = useDeletePlaylist(user?.id);
  const removeSong = useRemoveSongFromPlaylist(user?.id);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when edit modal is open
  useEffect(() => {
    if (isEditing) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isEditing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-black/90 text-white p-6 flex flex-col items-center justify-center text-center">
        <Music2 className="h-12 w-12 text-zinc-600 mb-3" />
        <h2 className="text-xl font-bold">Playlist not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-neutral-800 rounded-full text-xs font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = user?.id === playlist.user_id;
  const isSystemPlaylist = playlist.is_system;

  const handleOpenEdit = () => {
    setName(playlist.name);
    setDescription(playlist.description || '');
    setIsPublic(playlist.is_public);
    setCoverUrl(playlist.cover_image_url);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id || !name.trim()) return;
    await updatePlaylist.mutateAsync({
      playlistId: id,
      updates: {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        cover_image_url: coverUrl,
      },
    });
    setIsEditing(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      setIsUploading(true);
      const url = await uploadPlaylistCover(file, id);
      setCoverUrl(url);
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist.mutateAsync(id);
      navigate('/library');
    }
  };

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Playlist</span>
          {isOwner && !isSystemPlaylist ? (
            <button
              onClick={handleOpenEdit}
              className="p-2 -mr-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-5" />
          )}
        </div>
      </div>

      {/* Playlist Hero Info */}
      <div className="px-5 pt-4 pb-6 flex flex-col items-center text-center border-b border-white/5">
        <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-neutral-800 shadow-2xl mb-4 border border-white/10">
          {playlist.cover_image_url ? (
            <img src={playlist.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : playlist.songs.length > 0 && resolveCover(playlist.songs[0]) ? (
            <img src={resolveCover(playlist.songs[0])!} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="h-16 w-16 text-purple-400/40" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-white font-outfit mb-1">{playlist.name}</h1>
        {playlist.description && <p className="text-xs text-zinc-400 max-w-xs mb-3">{playlist.description}</p>}

        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-900 border border-white/10 text-zinc-300">
            {playlist.is_public ? (
              <>
                <Globe className="h-3 w-3 text-green-400" /> Public Playlist
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-purple-400" /> Private Playlist
              </>
            )}
          </span>
          <span className="text-[11px] font-bold text-zinc-500">{playlist.songs.length} songs</span>
        </div>

        {/* Play All Button */}
        {playlist.songs.length > 0 && (
          <button
            onClick={() => playQueue(playlist.songs, 0)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-sm shadow-xl shadow-purple-600/30 active:scale-95 transition-all"
          >
            <Play className="h-4 w-4 fill-current translate-x-0.5" />
            Play Playlist
          </button>
        )}
      </div>

      {/* Tracklist */}
      <div className="divide-y divide-white/5">
        {playlist.songs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs font-medium">
            This playlist is empty. Add songs using the "..." menu on any song.
          </div>
        ) : (
          playlist.songs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            const cover = resolveCover(song);

            return (
              <div key={song.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <span className="w-5 text-center text-xs font-bold text-zinc-600 tabular-nums">
                  {index + 1}
                </span>

                <div
                  className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 cursor-pointer"
                  onClick={() => (isCurrent ? togglePlay() : playSong(song, playlist.songs))}
                >
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="h-4 w-4 text-purple-400/40" />
                    </div>
                  )}
                  {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Pause className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => (isCurrent ? togglePlay() : playSong(song, playlist.songs))}
                >
                  <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{song.artist?.name ?? 'Unknown'}</p>
                </div>

                <span className="text-xs text-zinc-600 tabular-nums">{formatDuration(song.duration)}</span>

                <div onClick={(e) => e.stopPropagation()}>
                  <FavoriteButton songId={song.id} size="sm" />
                </div>

                {isOwner && !isSystemPlaylist && (
                  <button
                    onClick={() => removeSong.mutate({ playlistId: id!, songId: song.id })}
                    className="p-2 text-zinc-600 hover:text-red-400 active:scale-95 transition-colors"
                    title="Remove from playlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <SongActionMenu song={song} playlists={playlists} onPlayNext={playNext} onAddToQueue={addToQueue}>
                  <div className="p-2 text-zinc-500 hover:text-white cursor-pointer">
                    <Edit3 className="h-4 w-4 hidden" />
                  </div>
                </SongActionMenu>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <AnimatePresence>
          <motion.div
            key="edit-playlist-backdrop"
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !updatePlaylist.isPending && !isUploading && setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Escape' && !updatePlaylist.isPending && !isUploading && setIsEditing(false)}
            tabIndex={-1}
          >
            <motion.div
              key="edit-playlist-modal"
              className="w-full max-w-lg bg-neutral-950/90 backdrop-blur-xl border border-white/8 rounded-3xl p-5 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <h3 className="text-base font-bold text-white">Edit Playlist Details</h3>
                <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cover Upload */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="relative group w-20 h-20 rounded-xl bg-neutral-800 flex-shrink-0 overflow-hidden cursor-pointer border border-white/10"
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="h-6 w-6 text-purple-400/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverInputRef}
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </div>
                <div className="text-xs text-zinc-400">
                  Tap artwork box to upload or update custom playlist cover image.
                </div>
              </div>

              {/* Name input */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-3 bg-neutral-800/60 rounded-xl border border-white/5 mb-5">
                <div>
                  <p className="text-xs font-bold text-white">Public Playlist</p>
                  <p className="text-[11px] text-zinc-500">Visible to all users across the app</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button
                  onClick={handleSave}
                  disabled={updatePlaylist.isPending || isUploading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {updatePlaylist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
