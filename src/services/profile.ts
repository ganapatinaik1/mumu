import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Fetches the profile of a user by their UUID.
 */
export const getUserProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Updates the profile of the current user.
 * Restricted by RLS policies to authenticated owners.
 */
export const updateUserProfile = async (
  userId: string,
  profileData: Partial<Omit<Profile, 'id' | 'is_admin' | 'created_at' | 'updated_at'>>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Check if a username is available.
 * Note: Under strict default RLS (where select is "auth.uid() = id"),
 * this will always return true for unauthenticated sign-ups since
 * they cannot query other users' rows. 
 * Therefore, we recommend allowing SELECT using (true) for profile tables
 * to allow this check and future user-searching features.
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const cleanUsername = username.toLowerCase().trim();
  
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return false;
  }
  
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', cleanUsername);

  // If there's an error (e.g. table doesn't exist yet/RLS issues), we fall back gracefully 
  // and let the Postgres constraint catch duplicates during registration.
  if (error) {
    console.warn('Could not query username availability via API:', error.message);
    return true; 
  }

  return data ? data.length === 0 : true;
};
