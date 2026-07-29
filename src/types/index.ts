export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}
