import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Users,
  Check,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useSync } from '../contexts/SyncContext';
import { useAccentTheme } from '../contexts/AccentThemeContext';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
};

const Avatar: React.FC<{
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}> = ({ src, name, size = 36, className = '' }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = getInitials(name || '?');
  const bg = stringToColor(name || '?');
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
};

/* ─── Main Sync Page ───────────────────────────────────────────────────────── */

export const SyncPage: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { friends, isLoading: isLoadingFriends } = useFriends(user?.id ?? '');
  const {
    activeSession,
    pendingRequests,
    sentRequests,
    connectedFriend,
    createSession,
    acceptSession,
    declineSession,
    cancelSession,
    leaveSession,
  } = useSync();
  const { accentHex } = useAccentTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isHost = activeSession?.host_id === user?.id;
  const friendName = connectedFriend?.display_name || connectedFriend?.username || 'Friend';

  const filteredFriends = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return friends;
    return friends.filter(({ friend }) =>
      friend.username.toLowerCase().includes(q) ||
      (friend.display_name && friend.display_name.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  const handleSendInvite = async (friendId: string) => {
    setActionLoadingId(friendId);
    try {
      await createSession(friendId);
    } catch {
      // Silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAccept = async (sessionId: string) => {
    setActionLoadingId(sessionId);
    try {
      await acceptSession(sessionId);
    } catch {
      // Silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (sessionId: string) => {
    setActionLoadingId(sessionId);
    try {
      await declineSession(sessionId);
    } catch {
      // Silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    setActionLoadingId(sessionId);
    try {
      await cancelSession(sessionId);
    } catch {
      // Silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black/90 text-white pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl pt-safe border-b border-white/5">
        <div className="px-3 pt-3 pb-3 flex items-center gap-2">
          <button
            onClick={() => nav(-1)}
            className="p-2 -ml-1 text-zinc-400 hover:text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-outfit text-white">Sync Listening</h1>
            <p className="text-[11px] text-zinc-400">Listen together with friends</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-xl mx-auto">
        {/* ── COMPACT CONNECTED CARD ── */}
        {activeSession && connectedFriend && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5"
          >
            {/* Status indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full accent-transition" style={{ backgroundColor: accentHex }} />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full accent-transition animate-ping opacity-60" style={{ backgroundColor: accentHex }} />
            </div>

            {/* Small avatar */}
            <Avatar src={connectedFriend.avatar_url} name={friendName} size={34} />

            {/* Connection info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Listening with {friendName}</p>
              <p className="text-[11px] text-zinc-400">
                Connected • {isHost ? 'Host' : 'Collaborative'}
              </p>
            </div>

            {/* End Session button */}
            <button
              onClick={leaveSession}
              className="text-[11px] font-bold bg-white/10 border border-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full active:scale-95 transition-all flex-shrink-0"
            >
              End Session
            </button>
          </motion.div>
        )}

        {/* ── INCOMING INVITES ── */}
        {!activeSession && pendingRequests.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-extrabold text-purple-400 uppercase tracking-widest px-1">
              Invitations ({pendingRequests.length})
            </h2>
            {pendingRequests.map((req) => {
              const isLoading = actionLoadingId === req.id;
              const inviter = req.host;
              const name = inviter?.display_name || inviter?.username || 'Someone';
              return (
                <motion.div
                  key={req.id}
                  layout
                  className="bg-neutral-900 border border-white/5 rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <Avatar src={inviter?.avatar_url} name={name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{name}</p>
                    <p className="text-[11px] text-zinc-400">Wants to listen together</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      disabled={isLoading}
                      onClick={() => handleAccept(req.id)}
                      className="p-2 text-white rounded-xl active:scale-95 transition-all disabled:opacity-50 accent-transition"
                      style={{ backgroundColor: accentHex }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => handleDecline(req.id)}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-zinc-300 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </section>
        )}

        {/* ── SENT INVITES ── */}
        {!activeSession && sentRequests.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
              Pending ({sentRequests.length})
            </h2>
            {sentRequests.map((req) => {
              const guest = req.guest;
              const name = guest?.display_name || guest?.username || 'Friend';
              const isLoading = actionLoadingId === req.id;
              return (
                <div
                  key={req.id}
                  className="bg-neutral-900/60 border border-white/5 rounded-2xl p-3 flex items-center gap-3"
                >
                  <Avatar src={guest?.avatar_url} name={name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    <p className="text-[11px] text-zinc-500">Waiting for response…</p>
                  </div>
                  <button
                    onClick={() => handleCancel(req.id)}
                    disabled={isLoading}
                    className="text-[11px] font-bold text-zinc-400 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* ── INVITE FRIENDS ── */}
        {!activeSession && (
          <section className="space-y-3">
            <h2 className="text-xs font-extrabold text-zinc-300 uppercase tracking-widest px-1">
              Invite Friends
            </h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search friends…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-white/5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>

            {/* Friends list */}
            <div className="bg-neutral-900/60 rounded-2xl overflow-hidden border border-white/5">
              {isLoadingFriends ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10 px-6 text-zinc-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium text-zinc-400">
                    {searchQuery ? 'No matches' : 'No friends yet'}
                  </p>
                  <p className="text-xs mt-1">
                    {searchQuery ? 'Try a different search' : 'Add friends to start syncing'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredFriends.map(({ friend }) => {
                    const isPending = sentRequests.some((r) => r.guest_id === friend.id);
                    const isLoading = actionLoadingId === friend.id;
                    const name = friend.display_name || friend.username;
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <Avatar src={friend.avatar_url} name={name} size={34} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{name}</p>
                          <p className="text-[11px] text-zinc-500">@{friend.username}</p>
                        </div>

                        {isPending ? (
                          <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" /> Invited
                          </span>
                        ) : (
                          <button
                            disabled={isLoading || !!activeSession}
                            onClick={() => handleSendInvite(friend.id)}
                            className="text-xs font-bold text-white px-3.5 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50 accent-transition"
                            style={{ backgroundColor: accentHex }}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Invite'
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SyncPage;
