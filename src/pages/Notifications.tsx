import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Users, Music2, Info, Check, X, Eye,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFriendships, useRespondToFriendRequest } from '../hooks/useFriends';
import { useSync } from '../contexts/SyncContext';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────
type NotifType = 'friend_request' | 'playlist_invite' | 'sync_invite' | 'system';

interface Notification {
  id: string | number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  actionable: boolean;
  meta?: Record<string, any>;
}

// ─── Notif Icon ──────────────────────────────────────────────
const TypeIcon: React.FC<{ type: NotifType }> = ({ type }) => {
  const cls = 'h-5 w-5';
  if (type === 'friend_request') return <Users className={cls} />;
  if (type === 'playlist_invite') return <Music2 className={cls} />;
  if (type === 'sync_invite') return <Bell className={cls} />;
  return <Info className={cls} />;
};

const typeColor: Record<NotifType, string> = {
  friend_request: 'bg-purple-600/20 text-purple-400',
  playlist_invite: 'bg-blue-600/20 text-blue-400',
  sync_invite: 'bg-green-600/20 text-green-400',
  system: 'bg-neutral-700 text-zinc-400',
};

// ─── Single Notification Card ────────────────────────────────
const NotifCard: React.FC<{
  notif: Notification;
  onAccept?: () => void;
  onReject?: () => void;
  onView?: () => void;
  onRead?: () => void;
}> = ({ notif, onAccept, onReject, onView, onRead }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -40 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    className={`relative bg-neutral-900 rounded-2xl border ${notif.unread ? 'border-purple-500/20' : 'border-white/5'} p-4 mb-2 mx-4`}
  >
    {notif.unread && (
      <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-purple-400" />
    )}

    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor[notif.type]}`}>
        <TypeIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-snug">{notif.title}</p>
        <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">{notif.body}</p>
        <p className="text-[10px] text-zinc-600 mt-1.5">{notif.time}</p>
      </div>
    </div>

    {/* Actions */}
    {notif.actionable && (
      <div className="flex gap-2 mt-3">
        {onAccept && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold active:bg-purple-500 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </motion.button>
        )}
        {onReject && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onReject}
            className="flex-1 py-2 rounded-xl bg-neutral-800 text-zinc-300 text-xs font-bold active:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" /> Decline
          </motion.button>
        )}
        {onView && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onView}
            className="flex-1 py-2 rounded-xl bg-neutral-800 text-zinc-300 text-xs font-bold active:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </motion.button>
        )}
      </div>
    )}

    {!notif.actionable && notif.unread && (
      <button
        onClick={onRead}
        className="mt-2 text-[11px] text-purple-400 font-semibold"
      >
        Mark as read
      </button>
    )}
  </motion.div>
);

// ─── Notifications Page ───────────────────────────────────────
export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: allFriendships = [] } = useFriendships(user?.id ?? '');
  const respondMut = useRespondToFriendRequest(user?.id ?? '');
  const { pendingRequests, acceptSession, declineSession } = useSync();

  // Build real notifications from live data
  const pendingReceived = allFriendships.filter(
    f => f.status === 'pending' && f.addressee_id === user?.id
  );

  const friendNotifs: Notification[] = pendingReceived.map(f => ({
    id: f.id,
    type: 'friend_request' as const,
    title: 'Friend request',
    body: `${f.requester?.display_name || f.requester?.username} wants to be your friend`,
    time: 'Recently',
    unread: true,
    actionable: true,
    meta: { friendship: f },
  }));

  const syncNotifs: Notification[] = pendingRequests.map(r => ({
    id: r.id,
    type: 'sync_invite' as const,
    title: 'Sync Invite',
    body: `${r.host?.display_name || r.host?.username} wants to listen together`,
    time: 'Recently',
    unread: true,
    actionable: true,
    meta: { sync_id: r.id },
  }));

  const allNotifs = [...syncNotifs, ...friendNotifs];
  const unreadCount = allNotifs.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl pt-safe">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold font-outfit text-white">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">{unreadCount} unread</p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {allNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4 border border-white/5">
              <Bell className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-white font-semibold mb-1">No notifications yet.</p>
            <p className="text-zinc-500 text-sm">You're all caught up</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {allNotifs.map(notif => {
              const handleAccept = async () => {
                if (notif.type === 'friend_request') respondMut.mutate({ id: notif.id as string, status: 'accepted' });
                if (notif.type === 'sync_invite') {
                  await acceptSession(notif.id as string);
                  nav('/sync');
                }
              };
              const handleReject = () => {
                if (notif.type === 'friend_request') respondMut.mutate({ id: notif.id as string, status: 'rejected' });
                if (notif.type === 'sync_invite') declineSession(notif.id as string);
              };
              return (
                <NotifCard
                  key={notif.id}
                  notif={notif}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onView={notif.meta?.username ? () => nav(`/user/${notif.meta!.username}`) : undefined}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Notifications;
