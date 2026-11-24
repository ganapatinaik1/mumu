import React from 'react';
import { Music, AlertCircle, RefreshCw } from 'lucide-react';
import type { Song } from '../../types/music';
import { SongCard } from './SongCard';

interface SongListProps {
  songs: Song[];
  isLoading?: boolean;
  error?: Error | null;
  title?: string;
  onRetry?: () => void;
}

// ─── Skeleton ──────────────────────────────────────────────
const SongCardSkeleton: React.FC = () => (
  <div className="animate-pulse flex-shrink-0 w-40">
    <div className="aspect-square rounded-xl bg-neutral-800 mb-2.5" />
    <div className="h-3 bg-neutral-800 rounded w-3/4 mb-1.5" />
    <div className="h-2.5 bg-neutral-800 rounded w-1/2" />
  </div>
);

// ─── Component ─────────────────────────────────────────────
export const SongList: React.FC<SongListProps> = ({
  songs,
  isLoading,
  error,
  title,
  onRetry,
}) => {
  return (
    <section>
      {title && (
        <h2 className="text-[17px] font-bold text-white mb-4 font-outfit tracking-tight">
          {title}
        </h2>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SongCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-red-500/20 bg-neutral-900/60">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-white font-semibold mb-1 text-sm">Failed to load songs</p>
          <p className="text-zinc-400 text-xs mb-4">{error.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && songs.length === 0 && (
        <div className="rounded-2xl p-14 flex flex-col items-center justify-center text-center border border-white/5 bg-neutral-900/40">
          <div className="bg-purple-900/30 p-4 rounded-2xl border border-purple-500/20 mb-4">
            <Music className="h-10 w-10 text-purple-400" />
          </div>
          <p className="text-white font-semibold mb-1">No songs yet</p>
          <p className="text-zinc-400 text-sm max-w-xs">
            Once songs are added to the library, they'll appear here.
          </p>
        </div>
      )}

      {/* Songs – horizontal scroll row */}
      {!isLoading && !error && songs.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} queue={songs} />
          ))}
        </div>
      )}
    </section>
  );
};
