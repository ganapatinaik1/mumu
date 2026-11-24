# MuMu Project Context & Documentation

> For full architectural details, database schemas, and setup instructions, please see [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).

## Quick Summary
- **App Name**: MuMu Music Streaming
- **Target Platform**: Mobile-First (Web & Android/Capacitor ready)
- **Key Modules**:
  - **Auth**: Supabase Auth (`AuthContext`)
  - **Player**: Global Streaming Audio Context (`PlayerContext`) with gapless next-track preloading & HTTP range support.
  - **Admin**: Batch MP3 Upload, automatic ID3 tag extraction, auto artist resolution, cover art upload, and track editor.
  - **Social**: Friend requests, status management, public profile pages (`/user/:username`), and friend list.
  - **Search**: Debounced multi-category universal search across songs, artists, albums, and users.
  - **Profile**: Profile customization with direct avatar image upload to Supabase Storage.
