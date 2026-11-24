import type { Song, Artist, Album } from './music';
import type { Profile } from './index';

export interface SearchResults {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  users: Profile[];
}

export type SearchCategory = 'all' | 'songs' | 'artists' | 'albums' | 'users';
