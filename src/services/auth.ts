import { supabase } from './supabase';
import { checkUsernameAvailability } from './profile';

export const signUpUser = async (
  email: string,
  password: string,
  username: string,
  displayName: string
) => {
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    throw new Error('Username must be 3-20 characters, lowercase, numbers, and underscores only.');
  }

  const isAvailable = await checkUsernameAvailability(username);
  if (!isAvailable) {
    throw new Error('This username is already taken. Please choose another.');
  }

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
