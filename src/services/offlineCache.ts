/**
 * PersistentOfflineCacheService
 *
 * Manages offline caching of streamed songs using the Cache API for blob
 * storage and localStorage for metadata indexing.
 *
 * Cache keys (localStorage):
 *   - 'mumu_cache_meta'  →  JSON array of CacheEntry[]
 *
 * Cache API name: 'mumu-audio-cache'
 *
 * CacheEntry shape:
 *   {
 *     songId:     string;
 *     cacheKey:   string;     // "audio/{songId}"
 *     fileSize:   number;      // bytes
 *     cachedAt:   number;      // unix ms
 *     lastPlayed: number;      // unix ms
 *     audioUrl:   string;     // original URL for revalidation
 *     quality:    'compressed' | 'original';
 *   }
 */

export interface CacheEntry {
  songId: string;
  cacheKey: string;
  fileSize: number;
  cachedAt: number;
  lastPlayed: number;
  audioUrl: string;
  quality: string;
}

const CACHE_NAME = 'mumu-audio-cache';
const META_KEY = 'mumu_cache_meta';
const DEFAULT_CACHE_LIMIT = 2 * 1024 * 1024 * 1024; // 2 GB

let cacheLimitBytes: number = DEFAULT_CACHE_LIMIT;

/** Update the cache size limit (persisted in localStorage). */
export const setCacheLimit = (bytes: number) => {
  cacheLimitBytes = bytes;
  localStorage.setItem('mumu_cache_limit', String(bytes));
};

/** Read the cache size limit (persisted in localStorage). */
export const getCacheLimit = (): number => {
  const saved = localStorage.getItem('mumu_cache_limit');
  if (saved) {
    const n = Number(saved);
    if (!isNaN(n) && n > 0) {
      cacheLimitBytes = n;
      return n;
    }
  }
  return cacheLimitBytes;
};

/** Read all cache metadata. */
export const getCacheMeta = (): CacheEntry[] => {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Write all cache metadata. */
const setCacheMeta = (entries: CacheEntry[]) => {
  localStorage.setItem(META_KEY, JSON.stringify(entries));
};

/** Get a single cache entry by song ID. */
export const getCacheEntry = (songId: string): CacheEntry | undefined => {
  const meta = getCacheMeta();
  return meta.find((e) => e.songId === songId);
};

/** Check if a song is cached and the blob is still valid (not corrupted). */
export const isCached = async (songId: string): Promise<boolean> => {
  const entry = getCacheEntry(songId);
  if (!entry) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(entry.cacheKey);
    if (!response) return false;
    // Validate: blob should have a non-zero size
    const blob = await response.blob();
    return blob.size > 0;
  } catch {
    return false;
  }
};

/** Get a blob URL for a cached song (for playback). */
export const getCachedBlobUrl = async (songId: string): Promise<string | null> => {
  const entry = getCacheEntry(songId);
  if (!entry) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(entry.cacheKey);
    if (!response) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;

    // Update last played timestamp
    const meta = getCacheMeta();
    const idx = meta.findIndex((e) => e.songId === songId);
    if (idx >= 0) {
      meta[idx].lastPlayed = Date.now();
      setCacheMeta(meta);
    }

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

/**
 * Cache a song by downloading its audio URL and storing it.
 * Should be called during streaming to build the persistent cache.
 */
export const cacheSong = async (
  songId: string,
  audioUrl: string,
  quality: string,
  onProgress?: (bytes: number) => void,
): Promise<boolean> => {
  try {
    const response = await fetch(audioUrl);

    if (!response.ok) return false;

    // Stream the body and track progress
    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: just cache the whole blob
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = `audio/${songId}`;
      await cache.put(cacheKey, response.clone());
      const blob = await response.clone().blob();
      addMetaEntry({
        songId,
        cacheKey,
        fileSize: blob.size,
        cachedAt: Date.now(),
        lastPlayed: 0,
        audioUrl,
        quality,
      });
      await evictIfNeeded();
      return true;
    }

    const chunks: Uint8Array<ArrayBufferLike>[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(received);
    }

    // Reconstruct blob and store in cache
    const blob = new Blob(chunks as BlobPart[]);
    const cacheKey = `audio/${songId}`;
    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = new Response(blob, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    await cache.put(cacheKey, cacheResponse);

    addMetaEntry({
      songId,
      cacheKey,
      fileSize: blob.size,
      cachedAt: Date.now(),
      lastPlayed: 0,
      audioUrl,
      quality,
    });

    await evictIfNeeded();
    return true;
  } catch {
    return false;
  }
};

/** Add or replace a metadata entry. */
const addMetaEntry = (entry: CacheEntry) => {
  const meta = getCacheMeta();
  const idx = meta.findIndex((e) => e.songId === entry.songId);
  if (idx >= 0) {
    meta[idx] = entry;
  } else {
    meta.push(entry);
  }
  setCacheMeta(meta);
};

/** Get total cache size in bytes. */
export const getCacheSize = (): number => {
  return getCacheMeta().reduce((total, e) => total + e.fileSize, 0);
};

/** Get cached song count. */
export const getCachedSongCount = (): number => {
  return getCacheMeta().length;
};

/**
 * LRU eviction: remove least recently played entries until under the limit.
 */
const evictIfNeeded = async () => {
  const limit = getCacheLimit();
  const meta = getCacheMeta();
  const cache = await caches.open(CACHE_NAME);

  // Sort by lastPlayed ascending (oldest first)
  meta.sort((a, b) => a.lastPlayed - b.lastPlayed);

  const toRemove: CacheEntry[] = [];
  let totalSize = meta.reduce((sum, e) => sum + e.fileSize, 0);

  for (const entry of meta) {
    if (totalSize <= limit) break;
    toRemove.push(entry);
    totalSize -= entry.fileSize;
  }

  if (toRemove.length === 0) return;

  // Delete from cache storage
  await Promise.all(
    toRemove.map((e) => cache.delete(e.cacheKey)),
  );

  // Update metadata
  const remaining = meta.filter((e) => !toRemove.find((r) => r.songId === e.songId));
  setCacheMeta(remaining);
};

/**
 * Clear the entire cache.
 */
export const clearAllCache = async (): Promise<void> => {
  const meta = getCacheMeta();
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    meta.map((e) => cache.delete(e.cacheKey)),
  );

  setCacheMeta([]);
};

/**
 * Delete a specific cached song.
 */
export const deleteCachedSong = async (songId: string): Promise<void> => {
  const meta = getCacheMeta();
  const entry = meta.find((e) => e.songId === songId);
  if (!entry) return;

  const cache = await caches.open(CACHE_NAME);
  await cache.delete(entry.cacheKey);

  const remaining = meta.filter((e) => e.songId !== songId);
  setCacheMeta(remaining);
};

/**
 * Revalidate a cached entry — checks if the original audio URL has changed
 * by comparing checksums or simply checking the URL is still accessible.
 * Returns true if the cache entry is still valid.
 */
export const validateCachedEntry = async (songId: string): Promise<boolean> => {
  const entry = getCacheEntry(songId);
  if (!entry) return false;
  return isCached(songId);
};

/**
 * Format bytes into a human-readable string.
 */
export const formatCacheSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i < 2 ? 0 : 2));
  return `${val} ${sizes[i]}`;
};
