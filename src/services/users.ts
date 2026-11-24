import { supabase } from './supabase';
import type { Profile } from '../types';

export const getPublicProfile = async (username: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
};

export const getPublicProfileById = async (id: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
};
