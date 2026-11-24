import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Music, Users, X } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSync } from '../../contexts/SyncContext';
import { useAccentTheme } from '../../contexts/AccentThemeContext';
import { resolveCover } from '../../utils/formatTime';
import { FullScreenPlayer } from './FullScreenPlayer';

// ─── Mini progress bar ────────────────────────────────────────
const MiniProgressBar: React.FC<{
  currentTime: number; duration: number; onSeek: (t: number) => void;
}> = ({ currentTime, duration, onSeek }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!barRef.current || duration === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
  };

  return (
    <div
      ref={barRef}
      onClick={handleClick}
      className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 cursor-pointer"
    >
      <div
        className="h-full transition-all duration-200"
        style={{ width: `${pct}%`, backgroundColor: `rgba(255, 255, 255, 0.15)` }}
      />
    </div>
  );
};

// ─── Mini Player ─────────────────────────────────────────────
export const MusicPlayer: React.FC = () => {
  const {
    currentSong, isPlaying, currentTime, duration,
    togglePlay, next, prev, seek,
  } = usePlayer();

  const { activeSession, connectedFriend, leaveSession } = useSync();
  const { accentRgb } = useAccentTheme();

  const [expanded, setExpanded] = useState(false);

  if (!currentSong) return null;

  const coverUrl = resolveCover(currentSong);
  const artistName = currentSong.artist?.name ?? 'Unknown Artist';

  return (
    <>
      {/* Full-screen overlay */}
      <FullScreenPlayer open={expanded} onClose={() => setExpanded(false)} />

      {/* Mini Player Bar */}
      <motion.div
        className="w-[92%] flex flex-col gap-1.5"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {activeSession && connectedFriend && (
          <div className="rounded-t-full px-3 py-1 flex items-center justify-between accent-transition" style={{
            backgroundColor: `rgba(${accentRgb}, 0.9)`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset`,
          }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-black/20 overflow-hidden flex items-center justify-center">
                {connectedFriend.avatar_url ? (
                  <img src={connectedFriend.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="h-3 w-3 text-white" />
                )}
              </div>
              <span className="text-[11px] font-bold text-white">Listening together with {connectedFriend.display_name || connectedFriend.username}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); leaveSession(); }} className="text-white/80 hover:text-white px-2 cursor-pointer active:scale-95 transition-transform">
              <span className="text-[10px] font-bold uppercase hidden sm:inline mr-1">Leave</span><X className="h-3.5 w-3.5 inline" />
            </button>
          </div>
        )}

        {/* Glass card */}
        <div
          className="relative overflow-hidden cursor-pointer rounded-full"
          style={{
            backgroundColor: 'rgba(18, 18, 18, 0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset`,
          }}
          onClick={() => setExpanded(true)}
        >
          {/* Tinted art background */}
          {coverUrl && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-cover scale-110 opacity-20"
                style={{ filter: 'blur(20px)' }}
              />
            </div>
          )}

          <div className="relative flex items-center justify-between gap-3 px-3 py-3">
            {/* Left: cover + info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0 accent-transition" style={{ boxShadow: `0 2px 8px rgba(${accentRgb}, 0.25)` }}>
                {coverUrl
                  ? <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-purple-400/60" /></div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">{currentSong.title}</p>
                <p className="text-[11px] text-white/50 truncate">{artistName}</p>
              </div>
            </div>

            {/* Right: centered controls */}
            <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={prev}
                className="p-2 text-white/70 active:text-white transition-colors active:scale-90"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                className="p-2 text-white active:text-white transition-colors active:scale-90"
              >
                {isPlaying
                  ? <Pause className="h-5 w-5 fill-current" />
                  : <Play className="h-5 w-5 fill-current translate-x-[2px]" />
                }
              </button>

              <button
                onClick={next}
                className="p-2 text-white/70 active:text-white transition-colors active:scale-90"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Thin progress bar at bottom */}
          <MiniProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
        </div>
      </motion.div>
    </>
  );
};
