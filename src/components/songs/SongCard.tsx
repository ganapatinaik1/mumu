import React from 'react';
import { Play, Pause, Music } from 'lucide-react';
import type { Song } from '../../types/music';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration, resolveCover } from '../../utils/formatTime';
import { FavoriteButton } from '../common/FavoriteButton';

interface SongCardProps {
  song: Song;
  queue?: Song[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, queue }) => {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

  const isCurrentSong = currentSong?.id === song.id;
  const coverUrl = resolveCover(song);
  const artistName = song.artist?.name ?? 'Unknown Artist';

  const handleClick = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song, queue);
    }
  };

  return (
    <div
      className="group flex flex-col cursor-pointer flex-shrink-0 w-40"
      onClick={handleClick}
    >
      {/* Cover Image */}
      <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-neutral-800 mb-2.5 shadow-lg transition-transform duration-200 group-hover:scale-[1.03]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${song.title} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
            <Music className="h-10 w-10 text-purple-400/50" />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
          <span className="text-[9px] font-semibold text-white/80 tabular-nums">
            {formatDuration(song.duration)}
          </span>
        </div>

        {/* Favorite button (top-right) */}
        <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton songId={song.id} size="sm" />
        </div>

        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 bg-black/30 rounded-xl
            ${isCurrentSong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <div className="bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all rounded-full p-3 shadow-xl">
            {isCurrentSong && isPlaying ? (
              <Pause className="h-5 w-5 text-white fill-white" />
            ) : (
              <Play className="h-5 w-5 text-white fill-white translate-x-0.5" />
            )}
          </div>
        </div>

        {/* Currently Playing animated bars */}
        {isCurrentSong && isPlaying && (
          <div className="absolute top-2 right-2 flex items-end gap-[2px] h-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[3px] bg-purple-400 rounded-full"
                style={{
                  height: `${[55, 100, 70][i - 1]}%`,
                  animation: 'pulse 0.8s ease-in-out infinite alternate',
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="min-w-0">
        <p
          className={`text-[13px] font-semibold truncate transition-colors leading-tight ${
            isCurrentSong ? 'text-purple-400' : 'text-white'
          }`}
          title={song.title}
        >
          {song.title}
        </p>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={artistName}>
          {artistName}
        </p>
      </div>
    </div>
  );
};
