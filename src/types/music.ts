// ─── CORE MUSIC ENTITIES ─────────────────────────────────────────────────────

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string | null;
  cover_image_url: string | null;
  release_year: number | null;
  created_at: string;
  updated_at: string;
  // joined
  artist?: Artist;
}

/** The database is always the source of truth for song metadata.
 *  cover_image_url on the song itself overrides album cover art. */
export interface Song {
  id: string;
  title: string;
  artist_id: string | null;
  album_id: string | null;
  duration: number | null; // seconds
  genre: string | null;
  release_year: number | null;
  audio_url: string;
  compressed_audio_url?: string | null;
  cover_image_url: string | null;
  play_count: number;
  created_at: string;
  updated_at: string;
  // joined
  artist?: Artist;
  album?: Album;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  songs?: Song[];
  song_count?: number;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
  // joined
  song?: Song;
}

// ─── PLAYER ──────────────────────────────────────────────────────────────────

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackError: string | null; // set when playback fails (e.g. offline + not cached)
}

export interface PlayerActions {
  playSong: (song: Song, queue?: Song[]) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (newQueue: Song[]) => void;
  clearQueue: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

export type PlayerContextType = PlayerState &
  PlayerActions & {
    currentSong: Song | null;
  };
