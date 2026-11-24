import { supabase } from './supabase';
import type { Friendship } from '../types/social';

const FRIENDSHIP_SELECT = '*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)';

export const getFriendships = async (userId: string): Promise<Friendship[]> => {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Friendship[]) ?? [];
};

export const sendFriendRequest = async (addresseeId: string): Promise<Friendship> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' })
    .select(FRIENDSHIP_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as Friendship;
};

export const respondToFriendRequest = async (
  friendshipId: string,
  status: 'accepted' | 'rejected'
): Promise<Friendship> => {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId)
    .select(FRIENDSHIP_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as Friendship;
};

export const deleteFriendship = async (friendshipId: string): Promise<void> => {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
};

export const getFriendshipBetween = async (
  userId: string,
  otherUserId: string
): Promise<Friendship | null> => {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Friendship | null);
};
