import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  ChevronDown,
  Play, Pause, SkipBack, SkipForward,
  Music2, Users, Crown, MessageSquare, Cast, ListMusic,
} from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSync } from '../../contexts/SyncContext';
import { useAccentTheme } from '../../contexts/AccentThemeContext';
import { formatTime, resolveCover } from '../../utils/formatTime';
import { QueueDrawer } from './QueueDrawer';
import { LyricsSheet } from './LyricsSheet';
import { FavoriteButton } from '../common/FavoriteButton';
import { OverflowMenu } from './OverflowMenu';

// ─── Progress Bar ───────────────────────────────────────────────────────────
const FullProgressBar: React.FC<{
  currentTime: number; duration: number; onSeek: (t: number) => void; accentRgb: string; songId?: string;
}> = ({ currentTime, duration, onSeek, accentRgb, songId }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Smooth animated progress using Framer Motion
  const progressMotion = useMotionValue(0);
  const animatedWidth = useTransform(progressMotion, [0, 100], ['0%', '100%']);

  // Update the motion value smoothly on change, with instant reset on song change
  const prevSongIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (songId !== prevSongIdRef.current) {
      // Song changed — reset instantly then animate from 0
      progressMotion.set(0);
      prevSongIdRef.current = songId;
      // Use a tiny timeout to allow the reset to apply before animating
      const t = setTimeout(() => progressMotion.set(progress), 10);
      return () => clearTimeout(t);
    } else {
      // Same song — smooth animate
      progressMotion.set(progress);
    }
  }, [progress, songId, progressMotion]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || duration === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
  };

  return (
    <div className="w-full px-0">
      <div
        ref={barRef}
        onClick={handleClick}
        className="group relative h-2 bg-white/10 rounded-full cursor-pointer hover:h-2.5 transition-all"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: animatedWidth,
            backgroundColor: `rgb(${accentRgb})`,
            filter: 'brightness(1) saturate(0.8)',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100"
            transition={{ opacity: { duration: 0.2, ease: 'easeOut' } }}
          />
        </motion.div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-white/50 tabular-nums w-10">{formatTime(currentTime)}</span>

        <span className="text-[11px] text-white/50 tabular-nums w-10 text-right">
          -{formatTime(Math.max(0, duration - currentTime))}
        </span>
      </div>
    </div>
  );
};

// ─── Full Screen Player ─────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
}

export const FullScreenPlayer: React.FC<Props> = ({ open, onClose }) => {
  const {
    currentSong, isPlaying, currentTime, duration,
    togglePlay, next, prev, seek,
    queue, playbackError,
  } = usePlayer();
  const { activeSession, connectedFriend, isController } = useSync();

  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  // Swipe down to dismiss
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      onClose();
    }
  };
  if (!currentSong) return null;

  const coverUrl = resolveCover(currentSong ?? { cover_image_url: null, album: null });
  const { accentRgb } = useAccentTheme();

  const artistName = currentSong.artist?.name ?? 'Unknown Artist';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
          style={{ opacity, willChange: 'transform, opacity' }}
        >
          {/* Accent-tinted background, blurred album art + color wash */}
          <div className="absolute inset-0 overflow-hidden bg-[#0a0a0c]">
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-cover scale-125 blur-3xl opacity-70"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(${accentRgb}, 0.55) 0%, rgba(${accentRgb}, 0.22) 28%, rgba(8,8,10,0.88) 65%, rgba(6,6,7,0.98) 100%)`,
              }}
            />
            <div className="absolute inset-0 backdrop-blur-2xl bg-black/10" />
          </div>

          {/* Draggable content */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{ y, willChange: 'transform' }}
            className="relative flex flex-col h-full min-h-0 pt-safe overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sticky top-0 z-10">
              <motion.div
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-1 rounded-full bg-white/30"
              />
            </div>

            {/* Sync Badge */}
            {activeSession && connectedFriend && (
              <div className="flex justify-center -mb-2 mt-1 z-10 flex-shrink-0">
                <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 backdrop-blur-md">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-black/20 flex-shrink-0 flex items-center justify-center">
                    {connectedFriend.avatar_url ? (
                      <img src={connectedFriend.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white tracking-wide uppercase">Synced</span>
                  {isController && <Crown className="h-3 w-3 text-yellow-400 ml-0.5" />}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <button onClick={onClose} className="p-2 -ml-2 active:scale-90 transition-transform">
                <ChevronDown className="h-6 w-6 text-white" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2">
                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Now Playing</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
              <motion.div
                className="h-full flex flex-col items-center justify-center px-6"
                initial={{ opacity: 1 }}
              >
                {/* Album Art — springs up slightly when playing */}
                <motion.div
                  animate={{ scale: isPlaying ? 1.15 : 1, y: isPlaying ? 10 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 1 }}
                  className="w-[85%] aspect-square rounded-2xl overflow-hidden mb-18 mt-3 flex-shrink-0 will-change-transform"
                  style={{ boxShadow: `0 25px 60px -15px rgba(${accentRgb}, 0.5), 0 10px 25px -5px rgba(0,0,0,0.5)` }}
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                      <Music2 className="h-24 w-24 text-white/20" />
                    </div>
                  )}
                </motion.div>

                {/* Title row: song info + star + more — aligned to artwork edges */}
                <div className="w-[95%] flex items-center justify-between gap-3 mb-6 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-white truncate">{currentSong.title}</h1>
                    <p className="text-sm text-white/55 truncate">{artistName}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <FavoriteButton songId={currentSong.id} size="md" />
                    <OverflowMenu song={currentSong} />
                  </div>
                </div>

                {/* Playback Error Display */}
                {playbackError && (
                  <div className="w-[85%] mb-4 flex-shrink-0">
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">
                      <p className="text-xs text-red-300 font-medium">{playbackError}</p>
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="w-[93%] mb-2 flex-shrink-0">
                  <FullProgressBar currentTime={currentTime} duration={duration} onSeek={seek} accentRgb={accentRgb} songId={currentSong.id} />
                </div>

                {/* Transport Controls — plain icons, Apple Music style */}
                <div className="flex items-center justify-between w-full max-w-[280px] mt-4 mb-8 flex-shrink-0">
                  <button onClick={prev} className="p-2 active:scale-90 transition-transform text-white">
                    <SkipBack className="h-8 w-8 fill-current" />
                  </button>

                  <button onClick={togglePlay} className="p-2 active:scale-90 transition-transform text-white">
                    {isPlaying
                      ? <Pause className="h-11 w-11 fill-current" />
                      : <Play className="h-11 w-11 fill-current translate-x-0.5" />
                    }
                  </button>

                  <button onClick={next} className="p-2 active:scale-90 transition-transform text-white">
                    <SkipForward className="h-8 w-8 fill-current" />
                  </button>
                </div>

                {/* Bottom icon row: Lyrics / AirPlay / Queue */}
                <div className="flex items-center justify-between w-full max-w-[320px] mt-auto mb-8 flex-shrink-0">
                  <button
                    onClick={() => setLyricsOpen(true)}
                    className="p-2 active:scale-90 transition-transform"
                  >
                    <MessageSquare className="h-5 w-5 text-white/60" />
                  </button>

                  <button className="p-2 active:scale-90 transition-transform">
                    <Cast className="h-5 w-5 text-white/60" />
                  </button>

                  <button
                    onClick={() => setQueueDrawerOpen(true)}
                    className="p-2 active:scale-90 transition-transform relative"
                  >
                    <ListMusic className="h-5 w-5 text-white/60" />
                    {queue.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-white/20 text-[8px] font-bold text-white flex items-center justify-center">
                        {queue.length}
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Queue Drawer */}
          <QueueDrawer open={queueDrawerOpen} onClose={() => setQueueDrawerOpen(false)} />

          {/* Lyrics Sheet */}
          <LyricsSheet
            open={lyricsOpen}
            onClose={() => setLyricsOpen(false)}
            title={currentSong.title}
            artistName={artistName}
            accentRgb={accentRgb}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
