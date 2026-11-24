# MuMu — Mobile-First Music Streaming Platform

## 📱 Executive Overview
MuMu is a modern, high-performance, mobile-first music streaming and social web application. Designed to be lightweight and touch-friendly, it provides a native-like experience optimized for mobile viewports (and ready for Capacitor packaging) while maintaining full desktop responsiveness.

---

## 🛠️ Technology Stack
- **Frontend Framework**: React 18 + Vite + TypeScript
- **Styling & Aesthetics**: Vanilla CSS & Tailwind CSS v4, custom glassmorphism, mobile safe-area insets (`env(safe-area-inset-bottom)`), dark-mode color scheme.
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Data Fetching & State**: TanStack Query (React Query) + React Context (`AuthContext`, `PlayerContext`)
- **Iconography**: Lucide React
- **Routing**: React Router DOM v6 (`BrowserRouter`, `ProtectedRoute`, `AdminRoute`, `PublicRoute`)

---

## 🗄️ Database Architecture (`schema_v2.sql`)

### 1. `profiles`
Extends Supabase `auth.users`.
- `id` (UUID, FK to `auth.users.id`)
- `username` (text, unique)
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `is_admin` (boolean, default `false`)
- `created_at`, `updated_at` (timestamptz)

### 2. `songs`
Independent song entries linked to optional artist and album models.
- `id` (UUID, PK)
- `title` (text)
- `artist_id` (FK -> `artists.id`)
- `album_id` (FK -> `albums.id`)
- `duration` (integer, in seconds)
- `genre` (text)
- `release_year` (integer)
- `audio_url` (text, public Supabase Storage URL)
- `cover_image_url` (text, public artwork URL)
- `play_count` (bigint)
- `created_at`, `updated_at` (timestamptz)

### 3. `artists`
- `id` (UUID, PK)
- `name` (text)
- `bio` (text)
- `image_url` (text)

### 4. `albums`
- `id` (UUID, PK)
- `title` (text)
- `artist_id` (FK -> `artists.id`)
- `cover_image_url` (text)
- `release_year` (integer)

### 5. `playlists` & `playlist_songs`
User-curated playlists supporting public/private visibility and custom ordering.

### 6. `friendships`
Social system enabling user connections.
- `id` (UUID, PK)
- `requester_id` (FK -> `profiles.id`)
- `addressee_id` (FK -> `profiles.id`)
- `status` (`'pending'` | `'accepted'` | `'rejected'`)

---

## 🎵 Streaming Audio Player Architecture (`PlayerContext.tsx`)
The music player is built around a **module-level singleton HTML5 `Audio` instance**:
- **Instant Streaming**: Uses `preload = 'auto'` and listens to the `canplay` event so audio starts streaming as soon as the first packet buffers (without waiting for `canplaythrough`).
- **HTTP Range Request Support**: Fully compatible with Supabase Storage byte-range requests (`206 Partial Content`) for instant seeking and minimal initial latency.
- **Background Next-Track Pre-buffering**: Pre-buffers the next song in the queue on a background audio instance (`preloadAudio`), making track transitions gapless.
- **Cross-Page Persistence**: Audio continues playing uninterrupted while navigating between tabs or pages.

---

## 👥 Social & Friendship System (`useFriends.ts`, `FriendButton.tsx`)
- **Friend Requests**: Users can send, accept, reject, cancel, or remove friend connections.
- **Interactive Button Component**: `FriendButton` automatically handles friend status queries and displays appropriate action states (e.g. *Add Friend*, *Request Sent*, *Accept / Reject*, *Friends*).
- **Profile Inbox**: Pending incoming requests appear in a notification badge and request box on the user's Profile screen.
- **Public Profile View**: Navigating to `/user/:username` renders their bio, cover photo, friend status button, and mutual/public friend list.

---

## 🔍 Universal Search (`Search.tsx`, `search.ts`)
- Single unified search input with 300ms debouncing.
- Categorized result filters: **All**, **Songs**, **Artists**, **Albums**, **People**.
- Performs parallel case-insensitive SQL queries across `songs`, `artists`, `albums`, and `profiles`.

---

## ⚡ Admin Portal & Song Management (`Admin.tsx`, `id3Parser.ts`)
Protected by the `AdminRoute` guard (only accessible if `is_admin = true`):
- **Batch MP3 Upload**: Multi-file selection support with a live visual gradient progress bar tracking batch upload percentages and steps.
- **Automated ID3 Metadata Extraction**: Custom lightweight binary ID3 parser (`utils/id3Parser.ts`) reads song titles, artist names, and embedded cover art directly from the uploaded `.mp3` bytes in the browser.
- **Automatic Artist Resolution**: Auto-creates new artist entries in the database if the tag name isn't recognized yet.
- **Metadata Editing Sheet**: Modal interface to update title, cover image (via file upload or URL), artist, album, genre, and release year.

---

## 📱 Mobile UI & Layout Architecture
- **Navigation (`BottomNav.tsx`)**: Replaces traditional desktop sidebars with a mobile bottom navigation bar (`Home`, `Search`, `Profile`, and `Admin` for admins).
- **Player Positioning**: Floating player bar (`music-player-bar`) sits pinned directly above the bottom navigation bar.
- **Profile Management (`Profile.tsx`)**: Direct photo selection for avatar updates using Supabase Storage (no manual URL inputs required).
- **Safe Area Insets**: Full support for iOS/Android safe area padding (`pt-safe`, `pb-safe`).

---

## 🚀 Setup & Database Migration Checklist

1. **SQL Migration**:
   Run `schema_v2.sql` inside the **Supabase SQL Editor** to create all tables, indexes, triggers, and RLS policies.

2. **Storage Buckets**:
   Run the following SQL snippet in Supabase SQL Editor to initialize public storage buckets:

```sql
insert into storage.buckets (id, name, public)
values 
  ('audio-files', 'audio-files', true),
  ('cover-art', 'cover-art', true),
  ('artist-images', 'artist-images', true)
on conflict (id) do nothing;

create policy "Public Access Storage" on storage.objects for select
  using (bucket_id in ('audio-files', 'cover-art', 'artist-images'));

create policy "Authenticated Upload Storage" on storage.objects for insert
  with check (bucket_id in ('audio-files', 'cover-art', 'artist-images') and auth.role() = 'authenticated');
```

3. **Admin User Elevation**:
   To grant a user admin permissions:
```sql
update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
```
