import type { Profile } from './index';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  // joined
  requester?: Profile;
  addressee?: Profile;
}

/** Convenience shape for the current user's perspective */
export interface FriendEntry {
  friendship: Friendship;
  friend: Profile;
  isRequester: boolean;
}

export type FriendButtonState =
  | 'none'       // no relationship
  | 'pending_sent'
  | 'pending_received'
  | 'friends'
  | 'self';
