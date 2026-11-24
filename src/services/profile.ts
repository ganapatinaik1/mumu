import { supabase } from './supabase';
import type { Profile } from '../types';

export const getUserProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('cover-art')
    .upload(fileName, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('cover-art').getPublicUrl(fileName);
  return data.publicUrl;
};

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

  if (error) {
    console.warn('Could not query username availability via API:', error.message);
    return true; 
  }

  return data ? data.length === 0 : true;
};
