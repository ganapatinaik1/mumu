import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFriendships,
  getFriendshipBetween,
  sendFriendRequest,
  respondToFriendRequest,
  deleteFriendship,
} from '../services/friends';
import type { Profile } from '../types';
import type { FriendEntry, FriendButtonState } from '../types/social';

export const FRIENDS_KEY = (userId: string) => ['friendships', userId];

export const useFriendships = (userId: string) =>
  useQuery({
    queryKey: FRIENDS_KEY(userId),
    queryFn: () => getFriendships(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });

/** Derives accepted friends as FriendEntry[] for the given userId */
export const useFriends = (userId: string) => {
  const { data, ...rest } = useFriendships(userId);
  const friends: FriendEntry[] = (data ?? [])
    .filter((f) => f.status === 'accepted')
    .map((f) => ({
      friendship: f,
      friend: (f.requester_id === userId ? f.addressee! : f.requester!) as Profile,
      isRequester: f.requester_id === userId,
    }));
  return { friends, ...rest };
};

export const useFriendshipWith = (currentUserId: string, otherUserId: string) =>
  useQuery({
    queryKey: ['friendship_between', currentUserId, otherUserId],
    queryFn: () => getFriendshipBetween(currentUserId, otherUserId),
    enabled: Boolean(currentUserId) && Boolean(otherUserId) && currentUserId !== otherUserId,
    staleTime: 1000 * 30,
  });

export const useFriendButtonState = (
  currentUserId: string | undefined,
  otherUserId: string | undefined
): FriendButtonState => {
  const { data: friendship } = useFriendshipWith(
    currentUserId ?? '',
    otherUserId ?? ''
  );

  if (!currentUserId || !otherUserId) return 'none';
  if (currentUserId === otherUserId) return 'self';
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  if (friendship.status === 'pending') {
    return friendship.requester_id === currentUserId ? 'pending_sent' : 'pending_received';
  }
  return 'none';
};

// ─── Mutations ────────────────────────────────────────────────
export const useSendFriendRequest = (currentUserId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRIENDS_KEY(currentUserId) });
      qc.invalidateQueries({ queryKey: ['friendship_between'] });
    },
  });
};

export const useRespondToFriendRequest = (currentUserId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      respondToFriendRequest(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRIENDS_KEY(currentUserId) });
      qc.invalidateQueries({ queryKey: ['friendship_between'] });
    },
  });
};

export const useDeleteFriendship = (currentUserId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFriendship,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRIENDS_KEY(currentUserId) });
      qc.invalidateQueries({ queryKey: ['friendship_between'] });
    },
  });
};
