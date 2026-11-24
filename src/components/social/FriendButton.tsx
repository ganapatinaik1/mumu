import React from 'react';
import { UserPlus, UserCheck, Clock, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useFriendshipWith,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useDeleteFriendship,
} from '../../hooks/useFriends';

interface FriendButtonProps {
  targetUserId: string;
}

export const FriendButton: React.FC<FriendButtonProps> = ({ targetUserId }) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const { data: friendship, isLoading } = useFriendshipWith(currentUserId, targetUserId);
  const sendReq   = useSendFriendRequest(currentUserId);
  const respondMut = useRespondToFriendRequest(currentUserId);
  const deleteMut  = useDeleteFriendship(currentUserId);

  if (!currentUserId || currentUserId === targetUserId) return null;
  if (isLoading) return <div className="h-9 w-28 rounded-full bg-neutral-800 animate-pulse" />;

  const busy = sendReq.isPending || respondMut.isPending || deleteMut.isPending;

  if (!friendship || friendship.status === 'rejected') {
    return (
      <button
        disabled={busy}
        onClick={() => sendReq.mutate(targetUserId)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add Friend
      </button>
    );
  }

  if (friendship.status === 'accepted') {
    return (
      <button
        disabled={busy}
        onClick={() => deleteMut.mutate(friendship.id)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-800 text-zinc-300 text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
      >
        <UserCheck className="h-3.5 w-3.5 text-green-400" />
        Friends
      </button>
    );
  }

  if (friendship.status === 'pending') {
    if (friendship.requester_id === currentUserId) {
      // sent
      return (
        <button
          disabled={busy}
          onClick={() => deleteMut.mutate(friendship.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-800 text-zinc-400 text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" />
          Pending
        </button>
      );
    } else {
      // received
      return (
        <div className="flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => respondMut.mutate({ id: friendship.id, status: 'accepted' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            disabled={busy}
            onClick={() => respondMut.mutate({ id: friendship.id, status: 'rejected' })}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-800 text-zinc-400 active:scale-95 transition-transform disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }
  }

  return null;
};
