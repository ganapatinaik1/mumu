import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, Loader2 } from 'lucide-react';
import { useFriends } from '../../hooks/useFriends';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../contexts/SyncContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SyncInviteModal: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { friends, isLoading } = useFriends(user?.id ?? '');
  const { createSession, activeSession } = useSync();
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const handleInvite = async (friendId: string) => {
    setInvitingId(friendId);
    try {
      await createSession(friendId);
      // Wait a moment so user sees it submitted
      setTimeout(() => {
        setInvitingId(null);
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      setInvitingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed bottom-0 sm:bottom-auto sm:top-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-neutral-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl z-[120] w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-xl font-bold text-white">Start a Sync</h2>
              <button onClick={onClose} className="p-2 active:scale-95 transition-transform bg-white/5 rounded-full">
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            
            <p className="px-5 text-sm text-zinc-400 mb-2">Invite a friend to listen together.</p>

            <div className="max-h-[60vh] overflow-y-auto px-5 pb-6">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                </div>
              )}
              {!isLoading && friends.length === 0 && (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  No friends to invite yet.
                </div>
              )}
              {!isLoading && friends.map(({ friend }) => {
                const isInviting = invitingId === friend.id;
                
                return (
                  <div key={friend.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-white/5">
                      {friend.avatar_url
                        ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <User className="h-5 w-5 text-zinc-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{friend.display_name || friend.username}</p>
                      <p className="text-[11px] text-zinc-500 truncate">@{friend.username}</p>
                    </div>
                    {activeSession?.guest_id === friend.id && activeSession?.status === 'pending' ? (
                      <span className="text-[11px] font-bold text-purple-400 bg-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Sent
                      </span>
                    ) : (
                      <button
                        disabled={isInviting || !!activeSession}
                        onClick={() => handleInvite(friend.id)}
                        className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                      >
                        {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Invite'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
