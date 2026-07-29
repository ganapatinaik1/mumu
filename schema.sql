-- ==========================================
-- Database Schema for Music Streaming App
-- Complete Authentication & Profile Setup
-- ==========================================

-- 1. Create Profiles Table (Linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  is_admin boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Username rules (3 to 20 characters, lowercase alphanumeric/underscores)
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20),
  constraint username_chars check (username ~ '^[a-z0-9_]+$')
);

-- 2. Configure Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Option: Viewable by everyone (Required so users can search profiles & check availability before logging in)
create policy "Allow profile reading for everyone"
  on public.profiles for select
  using (true);

-- Option: Update only own profile
create policy "Allow profile updating for owners only"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Automatic Profile Creation Trigger Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, bio, is_admin)
  values (
    new.id,
    -- Extract username from metadata (passed during signUp)
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger to execute function on new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
