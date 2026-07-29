import { supabase } from './supabase';
import { checkUsernameAvailability } from './profile';

export const signUpUser = async (
  email: string,
  password: string,
  username: string,
  displayName: string
) => {
  // 1. Validate username client-side regex
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    throw new Error('Username must be 3-20 characters, lowercase, numbers, and underscores only.');
  }

  // 2. Double check username availability
  const isAvailable = await checkUsernameAvailability(username);
  if (!isAvailable) {
    throw new Error('This username is already taken. Please choose another.');
  }

  // 3. Register user in Supabase Auth
  // We supply metadata (username, display_name) so that our PostgreSQL trigger
  // can pick them up when creating the row in the Profiles table.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase().trim(),
        display_name: displayName.trim() || username.trim(),
      },
    },
  });

  if (error) throw error;

  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string) => {
  // Directs user to the /reset-password route on our dev/prod server
  const redirectUrl = `${window.location.origin}/reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) throw error;
  return data;
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
};
