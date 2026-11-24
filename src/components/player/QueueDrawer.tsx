import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import {
  X, Play, Trash2, Music2, Volume2, Shuffle, Repeat, Repeat1,
  GripVertical,
} from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useAccentTheme } from '../../contexts/AccentThemeContext';
import { resolveCover } from '../../utils/formatTime';
import type { Song } from '../../types/music';
import { FavoriteButton } from '../common/FavoriteButton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 };

// ─── Sortable Queue Item (memoized) ───────────────────────────────────────────
interface SortableQueueItemProps {
  song: Song;
  actualIndex: number;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
}

const SortableQueueItem = React.memo(
  ({ song, actualIndex, onPlay, onRemove }: SortableQueueItemProps) => {
    const cover = resolveCover(song);

    const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: song.id });

    // Use transform from @dnd-kit for drag position, no layout transitions during drag
    const style: React.CSSProperties = transform
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 100 : undefined,
          willChange: isDragging ? 'transform' : undefined,
        }
      : {};

    return (
      <div ref={setNodeRef} style={style} className="rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-transparent group">
          {/* Drag handle — ONLY element that can start a drag */}
          <motion.div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 rounded"
            whileTap={{ scale: 1.1 }}
          >
            <GripVertical className="h-4 w-4 text-zinc-600 group-hover:text-white/70 transition-colors" />
          </motion.div>

          {/* Cover */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
            {cover ? (
              <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 className="h-4 w-4 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(actualIndex);
            }}
          >
            <p className="text-xs font-semibold text-white truncate">
              {song.title}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">
              {song.artist?.name ?? 'Unknown'}
            </p>
          </div>

          {/* Favorite */}
          <div onClick={(e) => e.stopPropagation()}>
            <FavoriteButton songId={song.id} size="sm" />
          </div>

          {/* Remove */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove(actualIndex);
            }}
            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 active:scale-90 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            title="Remove from Queue"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.song.id === nextProps.song.id &&
      prevProps.song.title === nextProps.song.title &&
      prevProps.song.artist?.name === nextProps.song.artist?.name &&
      prevProps.actualIndex === nextProps.actualIndex
    );
  }
);

SortableQueueItem.displayName = 'SortableQueueItem';

// ─── Main Drawer ─────────────────────────────────────────────────────────────
export const QueueDrawer: React.FC<QueueDrawerProps> = ({ open, onClose }) => {
  const {
    queue,
    currentIndex,
    currentSong,
    isPlaying,
    playQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    togglePlay,
    toggleShuffle,
    toggleRepeat,
    repeatMode,
    isShuffle,
  } = usePlayer();
  const { accentRgb } = useAccentTheme();

  const accent = accentRgb ?? '139, 92, 246';
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  // Local state for the sortable list — only Up Next items
  const [sortableList, setSortableList] = useState<Song[]>(queue);

  // Sync with context queue when it changes externally (not during drag)
  useEffect(() => {
    const ids = queue.map((s) => s.id).join(',');
    const currentIds = sortableList.map((s) => s.id).join(',');
    if (ids !== currentIds) {
      setSortableList(queue);
    }
  }, [queue]);

  // Auto-scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sensors — touch-first with long-press activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 120,
        delayThreshold: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    // Prevent sheet dismissal while dragging an item
  }, []);

  // Handle drag move — auto-scroll near edges
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use the active draggable's coordinates
    const rect = event.over?.rect;
    if (!rect) return;

    const containerRect = container.getBoundingClientRect();
    const pointerY = rect.top + rect.height / 2;
    const relativeY = pointerY - containerRect.top;
    const threshold = 80;

    if (relativeY < threshold) {
      const speed = Math.max(1, (threshold - relativeY) / threshold * 6);
      container.scrollBy({ top: -speed, behavior: 'auto' });
    } else if (relativeY > containerRect.height - threshold) {
      const speed = Math.max(1, (relativeY - (containerRect.height - threshold)) / threshold * 6);
      container.scrollBy({ top: speed, behavior: 'auto' });
    }
  }, []);

  // Handle drag end — commit reorder to PlayerContext
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortableList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Commit to PlayerContext only when sortableList changes AND we're not dragging
  // This runs after setSortableList completes in handleDragEnd
  const prevCommittedRef = useRef<string>('');
  useEffect(() => {
    const currentIds = sortableList.map((s) => s.id).join(',');
    const prevIds = prevCommittedRef.current;

    if (currentIds !== prevIds) {
      prevCommittedRef.current = currentIds;
      reorderQueue(sortableList);
    }
  }, [sortableList, reorderQueue]);

  // Sheet drag
  const y = useMotionValue(0);

  const handleSheetDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      onClose();
    }
  };

  const nowPlaying = currentSong;

  // The "Up Next" items — everything after the current song in sortableList
  const currentSongInReorderList = sortableList.find((s) => s.id === currentSong?.id);
  const currentReorderIndex = currentSongInReorderList
    ? sortableList.findIndex((s) => s.id === currentSongInReorderList.id)
    : currentIndex;
  const upNext = sortableList.slice(currentReorderIndex + 1);

  // The sortable IDs for the Up Next items
  const sortableUpNextIds = upNext.map((s) => s.id);

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex flex-col justify-end"
      style={{
        backdropFilter: 'blur(2px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {/* Backdrop dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer container — draggable sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        dragMomentum={false}
        onDragEnd={handleSheetDragEnd}
        style={{ y, willChange: 'transform' }}
        className="w-full max-h-[85vh] bg-neutral-900 border-t border-white/10 rounded-t-[28px] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">Playing Next</h3>
          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <button
                onClick={clearQueue}
                className="text-xs text-zinc-400 hover:text-red-400 font-bold px-2.5 py-1 rounded-full bg-neutral-800 border border-white/5 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white bg-neutral-800 rounded-full border border-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Shuffle / Repeat pills */}
        <div className="px-5 pb-4 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleShuffle}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full transition-all"
            style={isShuffle
              ? { backgroundColor: `rgba(${accent}, 0.9)`, color: '#000' }
              : { backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Shuffle className={`h-4 w-4 ${isShuffle ? 'text-black' : 'text-white/70'}`} />
          </button>
          <button
            onClick={toggleRepeat}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full transition-all"
            style={repeatMode !== 'off'
              ? { backgroundColor: `rgba(${accent}, 0.9)`, color: '#000' }
              : { backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <RepeatIcon className={`h-4 w-4 ${repeatMode !== 'off' ? 'text-black' : 'text-white/70'}`} />
          </button>
        </div>

        {/* List Content — @dnd-kit Sortable */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-1 divide-y divide-white/5"
        >
          {/* NOW PLAYING SECTION (fixed, not sortable) */}
          {nowPlaying && (
            <div className="pb-4 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Now Playing
              </p>
              <motion.div
                layout
                transition={spring}
                className="flex items-center gap-3 p-2.5 rounded-xl border"
                style={{
                  backgroundColor: `rgba(${accent}, 0.08)`,
                  borderColor: `rgba(${accent}, 0.2)`,
                }}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                  {resolveCover(nowPlaying) ? (
                    <img src={resolveCover(nowPlaying)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="h-4 w-4 text-white/40" />
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Volume2 className="h-4 w-4 text-white animate-pulse" />
                      </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{nowPlaying.title}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{nowPlaying.artist?.name ?? 'Unknown'}</p>
                </div>

                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `rgba(${accent}, 0.9)` }}
                >
                  {isPlaying
                    ? <span className="font-bold text-xs text-black">||</span>
                    : <Play className="h-3.5 w-3.5 text-black fill-current translate-x-0.5" />
                  }
                </button>
              </motion.div>
            </div>
          )}

          {/* UP NEXT SECTION — @dnd-kit Sortable */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Up Next ({upNext.length})
            </p>

            {upNext.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs font-medium">
                No upcoming tracks in queue.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortableUpNextIds} strategy={verticalListSortingStrategy}>
                  {upNext.map((song) => {
                    const actualIndex = sortableList.indexOf(song);
                    return (
                      <SortableQueueItem
                        key={song.id}
                        song={song}
                        actualIndex={actualIndex}
                        onPlay={(idx) => playQueue(sortableList, idx)}
                        onRemove={(idx) => removeFromQueue(idx)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
