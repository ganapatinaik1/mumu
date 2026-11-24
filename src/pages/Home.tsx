import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Play, Music2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSongs } from '../hooks/useSongs';
import { useFriendships } from '../hooks/useFriends';
import { usePlayer } from '../hooks/usePlayer';
import { useSync } from '../contexts/SyncContext';
import { resolveCover, getTimeGreeting } from '../utils/formatTime';
import { FavoriteButton } from '../components/common/FavoriteButton';
import type { Song } from '../types/music';

// ─── Horizontal Song Card ───────────────────────────────────────────────────
const SongCard: React.FC<{ song: Song; queue: Song[]; size?: 'sm' | 'md' | 'lg' }> = ({
  song, queue, size = 'md',
}) => {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const isCurrent = currentSong?.id === song.id;
  const cover = resolveCover(song);
  const dim = size === 'sm' ? 'w-28' : size === 'lg' ? 'w-48' : 'w-36';

  const handleClick = () => isCurrent ? togglePlay() : playSong(song, queue);

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className={`${dim} flex-shrink-0 cursor-pointer group`}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-800 mb-2 shadow-md">
        {cover
          ? <img src={cover} alt={song.title} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><Music2 className="h-8 w-8 text-purple-400/40" /></div>
        }

        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
            {isCurrent && isPlaying
              ? <div className="flex gap-[3px] items-end h-4 px-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-[3px] bg-white rounded-full animate-pulse"
                      style={{ height: `${[55,100,70][i-1]}%`, animationDelay: `${i*0.12}s` }} />
                  ))}
                </div>
              : <Play className="h-4 w-4 text-white fill-white translate-x-0.5" />
            }
          </div>
        </div>

        {/* Favorite button (top-right corner) */}
        <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton songId={song.id} size="sm" />
        </div>
      </div>

      <p className={`text-[12px] font-semibold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>{song.title}</p>
      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{song.artist?.name ?? 'Unknown'}</p>
    </motion.div>
  );
};

// ─── Section Header ─────────────────────────────────────────────────────────
const Section: React.FC<{
  title: string; subtitle?: string; songs: Song[]; size?: 'sm' | 'md' | 'lg';
}> = ({ title, subtitle, songs, size }) => {
  if (!songs.length) return null;
  return (
    <section className="mb-7">
      <div className="flex items-end justify-between px-4 mb-3">
        <div>
          <h2 className="text-[17px] font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        <button className="text-xs text-purple-400 font-semibold">See all</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-1">
        {songs.map((s) => <SongCard key={s.id} song={s} queue={songs} size={size} />)}
      </div>
    </section>
  );
};

// ─── Skeleton ───────────────────────────────────────────────────────────────
const SectionSkeleton: React.FC = () => (
  <section className="mb-7">
    <div className="px-4 mb-3">
      <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse mb-1" />
      <div className="h-3 w-20 bg-neutral-800 rounded animate-pulse" />
    </div>
    <div className="flex gap-3 px-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="w-36 flex-shrink-0 animate-pulse">
          <div className="aspect-square rounded-xl bg-neutral-800 mb-2" />
          <div className="h-3 bg-neutral-800 rounded w-3/4 mb-1" />
          <div className="h-2.5 bg-neutral-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  </section>
);

// ─── Quick Play Row ──────────────────────────────────────────────────────────
const QuickPlays: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const { playSong, currentSong, togglePlay } = usePlayer();
  const recent = songs.slice(0, 6);
  if (!recent.length) return null;

  return (
    <section className="mb-7 px-4">
      <div className="grid grid-cols-2 gap-2">
        {recent.map((s) => {
          const isCurrent = currentSong?.id === s.id;
          const cover = resolveCover(s);
          return (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => isCurrent ? togglePlay() : playSong(s, recent)}
              className="flex items-center gap-2.5 bg-neutral-800/70 rounded-xl overflow-hidden active:bg-neutral-700/70 transition-colors text-left"
            >
              <div className="w-12 h-12 flex-shrink-0 overflow-hidden bg-neutral-700">
                {cover
                  ? <img src={cover} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music2 className="h-5 w-5 text-purple-400/40" /></div>
                }
              </div>
              <p className={`text-[12px] font-bold truncate pr-2 ${isCurrent ? 'text-purple-400' : 'text-white'}`}>{s.title}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

// ─── Home Page ───────────────────────────────────────────────────────────────
export const Home: React.FC = () => {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const { data: songs = [], isLoading } = useSongs();
  const { pendingRequests } = useSync();
  const { data: allFriendships = [] } = useFriendships(user?.id ?? '');

  const greeting = getTimeGreeting();
  const displayName = (profile?.display_name || profile?.username || 'there').toUpperCase();
  
  const unreadFriendRequests = allFriendships.filter(f => f.status === 'pending' && f.addressee_id === user?.id).length;
  const unread = pendingRequests.length + unreadFriendRequests;

  // derive "sections" from the single song list — in a real app you'd have separate queries
  const recentlyPlayed = songs.slice(0, 10);
  const madeForYou     = [...songs].reverse().slice(0, 10);
  const trending       = songs.slice(2, 12);

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl pt-safe">
        <div className="px-4 pt-5 pb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="text-2xl font-extrabold font-outfit text-white leading-tight">{displayName}</h1>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 mt-1">
            {/* Sync Button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => nav('/sync')}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold text-white flex items-center gap-1.5 cursor-pointer ${pendingRequests.length > 0 ? 'bg-purple-600/40 border-purple-500/60' : 'bg-neutral-800/60 border-white/8'}`}
            >
              <Users className="h-3.5 w-3.5 text-purple-400" />
              Sync{pendingRequests.length > 0 && <span className="bg-purple-400 text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{pendingRequests.length}</span>}
            </motion.button>

            {/* Notification Bell */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => nav('/notifications')}
                className="relative p-2 rounded-full bg-neutral-800/60 border border-white/8 cursor-pointer"
              >
                <Bell className="h-5 w-5 text-zinc-300" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-400 border border-black" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {isLoading ? (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        ) : (
          <>
            {/* Quick play grid — show recently loaded songs */}
            {recentlyPlayed.length > 0 && (
              <div className="mb-7">
                <div className="px-4 mb-3">
                  <h2 className="text-[17px] font-bold text-white">Quick picks</h2>
                </div>
                <QuickPlays songs={recentlyPlayed} />
              </div>
            )}

            <Section title="Library" subtitle={`${songs.length} songs`} songs={songs} size="md" />
            <Section title="Made For You" subtitle="Based on your taste" songs={madeForYou} size="md" />
            <Section title="Trending" subtitle="Hot right now" songs={trending} size="lg" />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
