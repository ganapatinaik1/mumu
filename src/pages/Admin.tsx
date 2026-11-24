import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Trash2, Edit3, X, Check, Loader2, Upload } from 'lucide-react';
import { useAdminSongs, useAdminArtists, useAdminAlbums, useUpdateSong, useDeleteSong, useCreateSong, useCreateArtist } from '../hooks/useAdmin';
import { adminUploadAudio, adminUploadCompressedAudio, adminUploadCover } from '../services/admin';
import { parseID3 } from '../utils/id3Parser';
import { compressAudio } from '../utils/audioCompression';
import type { Song } from '../types/music';

// ─── helpers ─────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{label}</label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-3 py-2.5 bg-neutral-900 border border-white/8 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-colors"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }> = ({ options, ...props }) => (
  <select
    {...props}
    className="w-full px-3 py-2.5 bg-neutral-900 border border-white/8 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors appearance-none"
  >
    <option value="">— None —</option>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

function useConfirmDelete() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const ask = (id: string) => setPendingId(id);
  const cancel = () => setPendingId(null);
  const confirm = (cb: (id: string) => void) => {
    if (pendingId) { cb(pendingId); setPendingId(null); }
  };
  return { pendingId, ask, cancel, confirm };
}

// ─── Admin Page ───────────────────────────────────────────────
export const Admin: React.FC = () => {
  const { data: songs = [], isLoading } = useAdminSongs();
  const { data: artists = [] } = useAdminArtists();
  const { data: albums = [] } = useAdminAlbums();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const createSong = useCreateSong();
  const createArtist = useCreateArtist();
  const delConf = useConfirmDelete();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState<Partial<Song>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });

  // Lock body scroll when edit modal is open
  useEffect(() => {
    if (editing) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [editing]);

  // Edit Handlers
  const openEdit = (song: Song) => {
    setEditing(song);
    setForm({
      title: song.title,
      artist_id: song.artist_id ?? '',
      album_id: song.album_id ?? '',
      genre: song.genre ?? '',
      release_year: song.release_year ?? undefined,
      duration: song.duration ?? undefined,
      cover_image_url: song.cover_image_url ?? '',
      audio_url: song.audio_url,
    });
  };

  const save = () => {
    if (!editing) return;
    updateSong.mutate({
      id: editing.id,
      updates: {
        title: form.title,
        artist_id: form.artist_id || null,
        album_id: form.album_id || null,
        genre: form.genre || null,
        release_year: form.release_year ? Number(form.release_year) : null,
        duration: form.duration ? Number(form.duration) : null,
        cover_image_url: form.cover_image_url || null,
        audio_url: form.audio_url,
      },
    }, { onSuccess: () => setEditing(null) });
  };

  // Upload new cover inside edit prompt
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    try {
      setUploadStatus('Uploading cover...');
      setIsUploading(true);
      const url = await adminUploadCover(file, form.title || editing.id);
      setForm((f) => ({ ...f, cover_image_url: url }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  // Batch Song MP3 Upload Process
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const total = files.length;
    let lastCreatedSong: Song | null = null;

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const currentNum = i + 1;
        
        // Progress calculations
        const fileBasePercent = Math.round((i / total) * 100);
        setUploadProgress({ current: currentNum, total, percent: fileBasePercent });

        // 1. Parse ID3
        setUploadStatus(`Processing (${currentNum}/${total}): Extracting metadata for "${file.name}"...`);
        const tags = await parseID3(file);
        
        let title = tags.title || file.name.replace(/\.[^/.]+$/, "");
        let extractedArtist = tags.artist;
        let coverUrl: string | null = null;
        let finalArtistId: string | null = null;

        // 2. Resolve Artist
        if (extractedArtist) {
          const existing = artists.find(a => a.name.toLowerCase() === extractedArtist!.toLowerCase());
          if (existing) {
            finalArtistId = existing.id;
          } else {
            try {
              setUploadStatus(`Processing (${currentNum}/${total}): Creating artist "${extractedArtist}"...`);
              const newArtist = await createArtist.mutateAsync({ name: extractedArtist });
              finalArtistId = newArtist.id;
            } catch (e) {
              console.warn('Could not auto-create artist:', e);
            }
          }
        }

        // 3. Compress & Upload ONLY Compressed Audio File
        let audioUrl: string;
        try {
          setUploadStatus(`Processing (${currentNum}/${total}): Compressing audio (~96 kbps)...`);
          setUploadProgress({ current: currentNum, total, percent: fileBasePercent + Math.round(40 / total) });
          const { compressedBlob, ext } = await compressAudio(file);
          setUploadStatus(`Processing (${currentNum}/${total}): Uploading compressed audio...`);
          setUploadProgress({ current: currentNum, total, percent: fileBasePercent + Math.round(75 / total) });
          audioUrl = await adminUploadCompressedAudio(compressedBlob, title, ext);
        } catch (compErr) {
          console.warn('Compression fallback to original:', compErr);
          setUploadStatus(`Processing (${currentNum}/${total}): Uploading audio...`);
          audioUrl = await adminUploadAudio(file);
        }

        // 4. Upload Cover Art
        if (tags.cover) {
          setUploadStatus(`Processing (${currentNum}/${total}): Uploading cover art...`);
          coverUrl = await adminUploadCover(tags.cover, title);
        }

        // 5. Save to database with compressed audio URL as primary audio_url
        setUploadStatus(`Processing (${currentNum}/${total}): Saving to database...`);
        setUploadProgress({ current: currentNum, total, percent: fileBasePercent + Math.round(95 / total) });
        const newSong = await createSong.mutateAsync({
          title,
          audio_url: audioUrl,
          compressed_audio_url: null,
          artist_id: finalArtistId,
          cover_image_url: coverUrl,
          duration: 0,
        } as any);

        lastCreatedSong = newSong;
      }

      setUploadProgress({ current: total, total, percent: 100 });
      setUploadStatus(`Successfully uploaded ${total} song(s)!`);

      // Open edit modal for the last uploaded song if 1 file, or let user edit from list
      if (total === 1 && lastCreatedSong) {
        openEdit(lastCreatedSong);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus('');
        setUploadProgress({ current: 0, total: 0, percent: 0 });
      }, 1500);
       if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-black/90 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-outfit">Manage Songs</h1>
            <p className="text-xs text-zinc-500">{songs.length} total tracks in library</p>
          </div>
          
          <input
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-bold active:scale-95 transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {isUploading && uploadStatus.includes('Upload') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Songs
            </button>
          </div>
        </div>

        {/* Progress Bar & Status */}
        {isUploading && (
          <div className="px-4 py-3 bg-purple-950/40 border-t border-purple-500/20 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-200 font-semibold truncate max-w-[70%]">{uploadStatus}</span>
              <span className="text-purple-400 font-bold">{uploadProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-purple-500/20">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 text-purple-400 animate-spin" /></div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
            <Music className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No songs found. Select and upload MP3 files to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {songs.map((song) => (
              <div key={song.id} className="flex items-center gap-3 py-3">
                <div className="w-12 h-12 rounded-lg bg-neutral-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                  {(song.cover_image_url || song.album?.cover_image_url)
                    ? <img src={song.cover_image_url || song.album?.cover_image_url || ''} alt="" className="w-full h-full object-cover" />
                    : <Music className="h-5 w-5 text-purple-400/50" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">{song.title}</p>
                  <p className="text-xs text-zinc-400 truncate">{song.artist?.name ?? 'Unknown Artist'} {song.album && `· ${song.album.title}`}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(song)} className="p-2.5 text-zinc-400 active:text-white transition-colors bg-neutral-900 rounded-full">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {delConf.pendingId === song.id ? (
                    <div className="flex bg-neutral-900 rounded-full p-0.5">
                      <button onClick={() => delConf.confirm((id) => deleteSong.mutate(id))} className="p-2 text-red-400"><Check className="h-4 w-4" /></button>
                      <button onClick={delConf.cancel} className="p-2 text-zinc-500"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => delConf.ask(song.id)} className="p-2.5 text-zinc-600 active:text-red-400 transition-colors bg-transparent border border-white/10 rounded-full ml-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <AnimatePresence>
          <motion.div
            key="edit-modal-backdrop"
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !updateSong.isPending && !isUploading && setEditing(null)}
            onKeyDown={(e) => e.key === 'Escape' && !updateSong.isPending && !isUploading && setEditing(null)}
            tabIndex={-1}
          >
            <motion.div
              key={editing.id}
              className="w-full max-w-lg bg-neutral-950/90 backdrop-blur-xl border border-white/8 rounded-3xl p-5 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Edit Song Metadata</h3>
                <button onClick={() => setEditing(null)} className="text-zinc-400 active:text-white bg-neutral-900 rounded-full p-1 border border-white/5">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                 <div className="relative group w-20 h-20 rounded-xl bg-neutral-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                    {(form.cover_image_url || editing.album?.cover_image_url)
                      ? <img src={form.cover_image_url || editing.album?.cover_image_url || ''} alt="" className="w-full h-full object-cover" />
                      : <Music className="h-6 w-6 text-purple-400/50" />
                    }
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold text-white"
                    >
                       Change
                    </div>
                    <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverUpload} />
                 </div>
                 <div className="flex-1 text-xs text-zinc-400">
                   Click the artwork to upload a new cover image. Supported formats: JPG, PNG, WEBP.
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                <Field label="Title">
                  <Input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </Field>
                <Field label="Artist">
                  <Select
                    value={form.artist_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, artist_id: e.target.value }))}
                    options={artists.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </Field>
                <Field label="Album">
                  <Select
                    value={form.album_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, album_id: e.target.value }))}
                    options={albums.map((a) => ({ value: a.id, label: a.title }))}
                  />
                </Field>
                
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Genre"><Input value={form.genre ?? ''} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} placeholder="Pop, Rock…" /></Field>
                  <Field label="Year"><Input type="number" value={form.release_year ?? ''} onChange={(e) => setForm((f) => ({ ...f, release_year: Number(e.target.value) }))} placeholder="2024" /></Field>
                </div>

                <div className="mt-4">
                  <button
                    disabled={updateSong.isPending || isUploading}
                    onClick={save}
                    className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {updateSong.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Admin;
