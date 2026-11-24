import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Music, Mic, Disc, User, X, Loader2 } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { usePlayer } from '../hooks/usePlayer';
import { resolveCover, formatDuration } from '../utils/formatTime';
import { FavoriteButton } from '../components/common/FavoriteButton';
import type { SearchCategory } from '../types/search';
import type { Song, Artist, Album } from '../types/music';
import type { Profile } from '../types';

// Simple debounce via useState + setTimeout
function useDebounce(value: string, delay = 400) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'all',     label: 'All'     },
  { id: 'songs',   label: 'Songs'   },
  { id: 'artists', label: 'Artists' },
  { id: 'albums',  label: 'Albums'  },
  { id: 'users',   label: 'People'  },
];

// ─── Result row components ────────────────────────────────────
const CoverThumb: React.FC<{ url: string | null; fallback: React.ReactNode }> = ({ url, fallback }) => (
  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center">
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : fallback}
  </div>
);

const SongRow: React.FC<{ song: Song; queue: Song[] }> = ({ song, queue }) => {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const isCurrent = currentSong?.id === song.id;
  const cover = resolveCover(song);
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors text-left"
      onClick={() => isCurrent ? togglePlay() : playSong(song, queue)}
    >
      <CoverThumb url={cover} fallback={<Music className="h-5 w-5 text-purple-400/60" />} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>{song.title}</p>
        <p className="text-xs text-zinc-400 truncate">{song.artist?.name ?? 'Unknown Artist'}</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <FavoriteButton songId={song.id} size="sm" />
      </div>
      <span className="text-xs text-zinc-500 flex-shrink-0">{formatDuration(song.duration)}</span>
      {isCurrent && isPlaying && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />}
    </button>
  );
};

const ArtistRow: React.FC<{ artist: Artist }> = ({ artist }) => {
  const nav = useNavigate();
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors text-left"
      onClick={() => nav(`/artist/${artist.id}`)}
    >
      <CoverThumb url={artist.image_url ?? null} fallback={<Mic className="h-5 w-5 text-purple-400/60" />} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
        <p className="text-xs text-zinc-500">Artist</p>
      </div>
    </button>
  );
};

const AlbumRow: React.FC<{ album: Album }> = ({ album }) => {
  const nav = useNavigate();
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors text-left"
      onClick={() => nav(`/album/${album.id}`)}
    >
      <CoverThumb url={album.cover_image_url ?? null} fallback={<Disc className="h-5 w-5 text-purple-400/60" />} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{album.title}</p>
        <p className="text-xs text-zinc-500 truncate">{album.artist?.name ?? 'Album'} · {album.release_year ?? ''}</p>
      </div>
    </button>
  );
};

const UserRow: React.FC<{ profile: Profile }> = ({ profile }) => {
  const nav = useNavigate();
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors text-left"
      onClick={() => nav(`/user/${profile.username}`)}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-white/5">
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : <User className="h-5 w-5 text-purple-400/60" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{profile.display_name || profile.username}</p>
        <p className="text-xs text-zinc-500">@{profile.username}</p>
      </div>
    </button>
  );
};

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <p className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
);

// ─── Main Search Page ─────────────────────────────────────────
export const Search: React.FC = () => {
  const [input, setInput] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const query = useDebounce(input);

  const { data, isLoading, isError, error } = useSearch(query);

  const totalResults = data
    ? data.songs.length + data.artists.length + data.albums.length + data.users.length
    : 0;

  const show = (cat: SearchCategory) => category === 'all' || category === cat;

  return (
    <div className="flex flex-col min-h-screen bg-black/90 pb-32">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl pt-safe">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-extrabold text-white font-outfit mb-3">Search</h1>
          {/* Search bar */}
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Songs, artists, albums, people…"
              className="w-full pl-10 pr-10 py-3 bg-neutral-900 border border-white/5 rounded-2xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {input && (
              <button
                className="absolute right-3.5 text-zinc-500 active:text-white"
                onClick={() => setInput('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === c.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-neutral-900 text-zinc-400 border border-white/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1">
        {/* Empty input */}
        {!query && (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
              <SearchIcon className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-sm">Search for songs, artists, albums, or people</p>
          </div>
        )}

        {/* Loading */}
        {query && isLoading && (
          <div className="flex items-center justify-center pt-16">
            <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {query && isError && (
          <div className="px-4 pt-8 text-center">
            <p className="text-red-400 text-sm">{(error as Error).message}</p>
          </div>
        )}

        {/* No results */}
        {query && !isLoading && !isError && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
            <p className="text-white font-semibold mb-1">No results for "{query}"</p>
            <p className="text-zinc-500 text-sm">Try a different search term.</p>
          </div>
        )}

        {/* Results */}
        {data && totalResults > 0 && (
          <div className="py-2">
            {show('songs') && data.songs.length > 0 && (
              <section>
                <SectionHeader label="Songs" />
                {data.songs.map((s) => <SongRow key={s.id} song={s} queue={data.songs} />)}
              </section>
            )}
            {show('artists') && data.artists.length > 0 && (
              <section>
                <SectionHeader label="Artists" />
                {data.artists.map((a) => <ArtistRow key={a.id} artist={a} />)}
              </section>
            )}
            {show('albums') && data.albums.length > 0 && (
              <section>
                <SectionHeader label="Albums" />
                {data.albums.map((a) => <AlbumRow key={a.id} album={a} />)}
              </section>
            )}
            {show('users') && data.users.length > 0 && (
              <section>
                <SectionHeader label="People" />
                {data.users.map((u) => <UserRow key={u.id} profile={u} />)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
