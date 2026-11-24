import { supabase } from './supabase';
import type { Song, Artist, Album } from '../types/music';

const SONG_SELECT = '*, artist:artists(*), album:albums(*, artist:artists(*))';

// ─── Songs ───────────────────────────────────────────────────
export const adminGetSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Song[]) ?? [];
};

export const adminUpdateSong = async (
  id: string,
  updates: Partial<Pick<Song, 'title' | 'artist_id' | 'album_id' | 'duration' | 'genre' | 'release_year' | 'cover_image_url' | 'audio_url'>>
): Promise<Song> => {
  const { data, error } = await supabase
    .from('songs')
    .update(updates)
    .eq('id', id)
    .select(SONG_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as Song;
};

export const adminDeleteSong = async (id: string): Promise<void> => {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const adminCreateSong = async (
  song: Pick<Song, 'title' | 'audio_url'> & Partial<Omit<Song, 'id' | 'created_at' | 'updated_at' | 'play_count'>>
): Promise<Song> => {
  const { data, error } = await supabase
    .from('songs')
    .insert(song)
    .select(SONG_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as Song;
};

// ─── Artists ─────────────────────────────────────────────────
export const adminGetArtists = async (): Promise<Artist[]> => {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data as Artist[]) ?? [];
};

export const adminCreateArtist = async (
  artist: Pick<Artist, 'name'> & Partial<Pick<Artist, 'bio' | 'image_url'>>
): Promise<Artist> => {
  const { data, error } = await supabase.from('artists').insert(artist).select('*').single();
  if (error) throw new Error(error.message);
  return data as Artist;
};

export const adminUpdateArtist = async (
  id: string,
  updates: Partial<Pick<Artist, 'name' | 'bio' | 'image_url'>>
): Promise<Artist> => {
  const { data, error } = await supabase
    .from('artists')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Artist;
};

export const adminDeleteArtist = async (id: string): Promise<void> => {
  const { error } = await supabase.from('artists').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ─── Albums ───────────────────────────────────────────────────
export const adminGetAlbums = async (): Promise<Album[]> => {
  const { data, error } = await supabase
    .from('albums')
    .select('*, artist:artists(*)')
    .order('title');
  if (error) throw new Error(error.message);
  return (data as Album[]) ?? [];
};

export const adminCreateAlbum = async (
  album: Pick<Album, 'title'> & Partial<Pick<Album, 'artist_id' | 'cover_image_url' | 'release_year'>>
): Promise<Album> => {
  const { data, error } = await supabase.from('albums').insert(album).select('*, artist:artists(*)').single();
  if (error) throw new Error(error.message);
  return data as Album;
};

export const adminUpdateAlbum = async (
  id: string,
  updates: Partial<Pick<Album, 'title' | 'artist_id' | 'cover_image_url' | 'release_year'>>
): Promise<Album> => {
  const { data, error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', id)
    .select('*, artist:artists(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as Album;
};

export const adminDeleteAlbum = async (id: string): Promise<void> => {
  const { error } = await supabase.from('albums').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ─── Storage ──────────────────────────────────────────────────

/** Upload original audio and return its public URL */
export const adminUploadAudio = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, file, { contentType: file.type || 'audio/mpeg' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('audio-files').getPublicUrl(fileName);
  return data.publicUrl;
};

/** Upload a pre-compressed audio blob (e.g. opus/webm) to a separate compressed bucket path */
export const adminUploadCompressedAudio = async (
  blob: Blob,
  baseName: string,
  ext: string
): Promise<string> => {
  const fileName = `compressed/${Date.now()}-${Math.random().toString(36).substring(7)}-${baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;

  const { error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, blob, { contentType: blob.type || 'audio/webm' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('audio-files').getPublicUrl(fileName);
  return data.publicUrl;
};

export const adminUploadCover = async (file: Blob, nameStr: string): Promise<string> => {
  const fileName = `${Date.now()}-${nameStr.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
  
  const { error } = await supabase.storage
    .from('cover-art')
    .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('cover-art').getPublicUrl(fileName);
  return data.publicUrl;
};
