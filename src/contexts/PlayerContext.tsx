import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { Song, PlayerContextType, RepeatMode } from '../types/music';
import { useSettings } from './SettingsContext';
import { useAccentTheme } from './AccentThemeContext';
import {
  isCached,
  getCachedBlobUrl,
  cacheSong,
  getCacheEntry,
} from '../services/offlineCache';
import { extractDominantColor } from '../hooks/useAccentColor';
import { DEFAULT_HEX as DEFAULT_ACCENT_HEX } from '../contexts/AccentThemeContext';

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Single persistent Audio element — never recreated, never removed from DOM.
// NO crossOrigin header: Supabase public storage doesn't require it and it
// blocks HTTP range requests on some CDN configurations, causing full-file
// downloads instead of byte-range streaming (which is why songs take 60s).
export const audio = new Audio();
audio.preload = 'none'; // Don't auto-download until play() is called

export const notifySyncControl = (action: 'play' | 'pause') => {
  window.dispatchEvent(new CustomEvent('mumu-sync-control', { detail: { action } }));
};

// Background preloader for the next track
const preloadAudio = new Audio();
preloadAudio.preload = 'none';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { audioQuality, offlineCacheEnabled } = useSettings();
  const { setAccentFromHex } = useAccentTheme();

  // Resolve audio URL with cache-first priority:
  // 1. Check persistent cache → return blob URL if cached
  // 2. Otherwise return the streaming URL (which will be cached during playback)
  const resolveAudioUrl = useCallback(
    async (song: Song): Promise<string> => {
      const streamingUrl =
        audioQuality === 'compressed' && song.compressed_audio_url
          ? song.compressed_audio_url
          : song.audio_url;

      if (!offlineCacheEnabled) return streamingUrl;

      // Check if this version of the song is cached
      const entry = getCacheEntry(song.id);
      if (entry && entry.quality === audioQuality) {
        const valid = await isCached(song.id);
        if (valid) {
          const blobUrl = await getCachedBlobUrl(song.id);
          if (blobUrl) return blobUrl;
        }
      }

      // Not cached — return streaming URL; cache will be saved during playback
      return streamingUrl;
    },
    [audioQuality, offlineCacheEnabled]
  );

  // Synchronous helper for getting the streaming URL (no cache check)
  const getStreamingUrl = useCallback(
    (song: Song): string => {
      if (audioQuality === 'compressed' && song.compressed_audio_url) {
        return song.compressed_audio_url;
      }
      return song.audio_url;
    },
    [audioQuality]
  );

  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const currentIndex_ref = useRef(currentIndex);
  const queue_ref = useRef(queue);
  const repeatMode_ref = useRef(repeatMode);
  const isShuffle_ref = useRef(isShuffle);
  const isPlaying_ref = useRef(isPlaying);
  const pendingPlay = useRef(false); // true when play() needs to fire on canplay
  const lastPlayedSongIdRef = useRef<string | null>(null); // track last played song for change detection
  const pendingCacheRef = useRef<{ songId: string; url: string; quality: string } | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  useEffect(() => { currentIndex_ref.current = currentIndex; }, [currentIndex]);
  useEffect(() => { queue_ref.current = queue; }, [queue]);
  useEffect(() => { repeatMode_ref.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffle_ref.current = isShuffle; }, [isShuffle]);
  useEffect(() => { isPlaying_ref.current = isPlaying; }, [isPlaying]);

  // Derive current song
  const currentSong = currentIndex >= 0 && currentIndex < queue.length
    ? queue[currentIndex]
    : null;

  // Update global accent theme when song changes
  useEffect(() => {
    if (!currentSong) {
      setAccentFromHex(DEFAULT_ACCENT_HEX);
      return;
    }
    const coverUrl = currentSong.cover_image_url || currentSong.album?.cover_image_url;
    if (!coverUrl) {
      setAccentFromHex(DEFAULT_ACCENT_HEX);
      return;
    }
    extractDominantColor(coverUrl).then((hex) => {
      setAccentFromHex(hex);
    });
  }, [currentSong?.id, currentSong?.cover_image_url, currentSong?.album?.cover_image_url, setAccentFromHex]);

  const attemptPlay = useCallback(() => {
    if (!audio.src) return;
    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        if (err.name !== 'AbortError') console.warn('Playback deferred:', err);
        setIsPlaying(false);
        pendingPlay.current = false;
      });
  }, []);

  const preloadNextTrack = useCallback(() => {
    const q = queue_ref.current;
    const idx = currentIndex_ref.current;
    if (idx < 0 || idx >= q.length - 1) return;
    const next = q[idx + 1];
    const url = getStreamingUrl(next);
    if (next && url && preloadAudio.src !== url) {
      preloadAudio.src = url;
      preloadAudio.preload = 'auto';
      preloadAudio.load();
    }
  }, [getStreamingUrl]);

  // Wire audio events once
  useEffect(() => {
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => { setIsPlaying(true); pendingPlay.current = false; };
    const onPause = () => setIsPlaying(false);

    // This fires as soon as the browser has enough data to begin playback.
    // We fire play() here — this is the earliest possible moment.
    const onCanPlay = () => {
      if (pendingPlay.current) {
        pendingPlay.current = false;
        audio.play().then(() => setIsPlaying(true)).catch(console.warn);
      }
    };

    const onEnded = () => {
      const q = queue_ref.current;
      const idx = currentIndex_ref.current;
      const repeat = repeatMode_ref.current;
      const shuffle = isShuffle_ref.current;
      if (repeat === 'one') { audio.currentTime = 0; attemptPlay(); return; }
      if (shuffle) { setCurrentIndex(Math.floor(Math.random() * q.length)); return; }
      const isLast = idx === q.length - 1;
      if (isLast) {
        if (repeat === 'all') setCurrentIndex(0);
        else { setIsPlaying(false); setCurrentTime(0); }
      } else {
        setCurrentIndex(idx + 1);
      }
    };

    const onVolumeChange = () => {
      setVolumeState(audio.volume);
      setIsMuted(audio.muted);
    };

    // Stall detection & recovery: if audio progress freezes while playing, recover
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let cacheTimer: ReturnType<typeof setTimeout> | null = null;

    const handleStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (isPlaying_ref.current && !audio.ended) {
          if (audio.paused) {
            audio.play().catch(() => {});
          } else if (audio.readyState < 3) {
            const savedTime = audio.currentTime;
            audio.load();
            audio.currentTime = savedTime;
            audio.play().catch(() => {});
          }
        }
      }, 4000);
    };

    const onWaiting = () => handleStall();
    const onStalled = () => handleStall();

    const onPlaying = () => {
      if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }

      // Defer background caching by 5s so initial playback network buffer is not choked
      if (pendingCacheRef.current) {
        const cacheInfo = pendingCacheRef.current;
        pendingCacheRef.current = null;
        if (cacheTimer) clearTimeout(cacheTimer);
        cacheTimer = setTimeout(() => {
          cacheSong(cacheInfo.songId, cacheInfo.url, cacheInfo.quality, undefined).catch(() => {});
        }, 5000);
      }
    };

    // Handle playback errors (e.g. offline and not cached)
    const onError = () => {
      if (currentSong) {
        if (!navigator.onLine) {
          setPlaybackError(`"${currentSong.title}" is not available offline. Connect to the internet and try again.`);
        } else {
          setPlaybackError(`"${currentSong.title}" could not be played. Please check your connection.`);
        }
        setIsPlaying(false);
      }
    };

    // Clear error when playback succeeds
    const onCanPlayForError = () => {
      setPlaybackError(null);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('canplay', onCanPlayForError);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('volumechange', onVolumeChange);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    audio.volume = 0.8;

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('canplay', onCanPlayForError);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('volumechange', onVolumeChange);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      if (stallTimer) clearTimeout(stallTimer);
      if (cacheTimer) clearTimeout(cacheTimer);
      pendingPlay.current = false;
    };
  }, [attemptPlay]);

  // Load + play when currentIndex changes
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= queue.length) return;
    const song = queue[currentIndex];
    if (!song?.audio_url) return;

    let cancelled = false;

    // Resolve URL: check cache first, fall back to streaming
    resolveAudioUrl(song).then((url) => {
      if (cancelled) return;

      // Clear any previous playback error
      setPlaybackError(null);

      // Only restart audio if the current song actually changed.
      // Queue-only mutations (like playNext / addToQueue) must not interrupt playback.
      const prevSongId = lastPlayedSongIdRef.current;
      if (prevSongId !== song.id) {
        lastPlayedSongIdRef.current = song.id;
        // Pause any current playback immediately to free network bandwidth
        audio.pause();

        // If this is a streaming URL (not blob), prepare to cache in background
        if (offlineCacheEnabled && !url.startsWith('blob:')) {
          // Store cache info to start caching once playback actually begins
          pendingCacheRef.current = { songId: song.id, url, quality: audioQuality };
        } else {
          pendingCacheRef.current = null;
        }

        // Safely manage blob URLs: revoke previous blob URL if switching to a new song
        if (activeBlobUrlRef.current && activeBlobUrlRef.current !== url) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }

        if (url.startsWith('blob:')) {
          activeBlobUrlRef.current = url;
        }

        audio.src = url;

        // Don't set currentTime yet — let browser start from 0

        // Mark that we want to play as soon as first bytes arrive
        pendingPlay.current = true;
        setIsPlaying(true);

        // Trigger load and start receiving bytes — play() will be called from onCanPlay
        audio.preload = 'auto';
        audio.load();

        // Also attempt play directly — browser may already have data (cache)
        // or will start playing immediately (streaming servers)
        audio.play()
          .then(() => { setIsPlaying(true); pendingPlay.current = false; })
          .catch((err) => {
            // Expected: "play() interrupted by load()" — onCanPlay will handle it
            if (err.name !== 'AbortError') console.warn('Initial play catch:', err);
          });

        // Preload next track in background after a 8s delay so current track stream is established
        setTimeout(() => preloadNextTrack(), 8000);
      }
    });

    return () => {
      cancelled = true;
      pendingPlay.current = false;
    };
  }, [currentIndex, queue, audioQuality, offlineCacheEnabled, resolveAudioUrl, preloadNextTrack]); // eslint-disable-line

  const playSong = useCallback((song: Song, newQueue?: Song[]) => {
    const q = newQueue ?? [song];
    const idx = q.findIndex((s) => s.id === song.id);
    setQueue(q);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, []);

  const playQueue = useCallback((songs: Song[], startIndex = 0) => {
    setQueue(songs);
    setCurrentIndex(startIndex);
  }, []);

  const playNext = useCallback((song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) { setCurrentIndex(0); return [song]; }
      const newQ = [...prevQueue];
      newQ.splice(currentIndex_ref.current + 1, 0, song);
      return newQ;
    });
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) { setCurrentIndex(0); return [song]; }
      return [...prevQueue, song];
    });
  }, []);

  const removeFromQueue = useCallback((targetIndex: number) => {
    setQueue((prevQueue) => {
      if (targetIndex < 0 || targetIndex >= prevQueue.length) return prevQueue;
      const newQ = prevQueue.filter((_, i) => i !== targetIndex);
      const currIdx = currentIndex_ref.current;
      if (targetIndex < currIdx) setCurrentIndex(currIdx - 1);
      else if (targetIndex === currIdx) {
        if (newQ.length === 0) { setCurrentIndex(-1); audio.pause(); setIsPlaying(false); }
        else if (currIdx >= newQ.length) setCurrentIndex(newQ.length - 1);
      }
      return newQ;
    });
  }, []);

  const reorderQueue = useCallback((newQueue: Song[]) => {
    setQueue((prevQueue) => {
      // Build a map of song ID -> new position
      const newIndexMap = new Map<string, number>();
      newQueue.forEach((s, i) => newIndexMap.set(s.id, i));

      // Find the current song in the new arrangement
      const currSongId = prevQueue[currentIndex_ref.current]?.id;
      const newCurrIdx = currSongId !== undefined ? (newIndexMap.get(currSongId) ?? 0) : 0;

      if (newCurrIdx !== currentIndex_ref.current) {
        setCurrentIndex(newCurrIdx);
      }

      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prevQueue) => {
      const currIdx = currentIndex_ref.current;
      if (currIdx >= 0 && currIdx < prevQueue.length) {
        setCurrentIndex(0);
        return [prevQueue[currIdx]];
      }
      setCurrentIndex(-1);
      return [];
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (audio.paused) {
      setIsPlaying(true);
      attemptPlay();
      notifySyncControl('play');
    } else {
      audio.pause();
      setIsPlaying(false);
      notifySyncControl('pause');
    }
  }, [attemptPlay]);

  const next = useCallback(() => {
    const q = queue_ref.current;
    const idx = currentIndex_ref.current;
    if (q.length === 0) return;
    if (isShuffle_ref.current) { setCurrentIndex(Math.floor(Math.random() * q.length)); return; }
    const nextIdx = idx + 1;
    if (nextIdx < q.length) setCurrentIndex(nextIdx);
    else if (repeatMode_ref.current === 'all') setCurrentIndex(0);
  }, []);

  const prev = useCallback(() => {
    const idx = currentIndex_ref.current;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const prevIdx = idx - 1;
    if (prevIdx >= 0) setCurrentIndex(prevIdx);
    else if (repeatMode_ref.current === 'all') setCurrentIndex(queue_ref.current.length - 1);
  }, []);

  const seek = useCallback((time: number) => {
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    audio.volume = clamped;
    if (clamped > 0) audio.muted = false;
  }, []);

  const toggleMute = useCallback(() => { audio.muted = !audio.muted; }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle((prev) => !prev), []);

  // MediaSession API Integration for Android / Lockscreen / Notification / Samsung Now Bar
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      let rawArtwork = currentSong.cover_image_url || currentSong.album?.cover_image_url || '/app_icon.jpg';
      let artworkSrc = rawArtwork;
      
      // Ensure absolute URL for Android MediaSession
      if (artworkSrc.startsWith('/')) {
        artworkSrc = window.location.origin + artworkSrc;
      }

      const artistName = currentSong.artist?.name || 'Unknown Artist';
      const albumTitle = currentSong.album?.title || 'mumu';

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: artistName,
          album: albumTitle,
          artwork: [
            { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
            { src: artworkSrc, sizes: '128x128', type: 'image/jpeg' },
            { src: artworkSrc, sizes: '192x192', type: 'image/jpeg' },
            { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
            { src: artworkSrc, sizes: '384x384', type: 'image/jpeg' },
            { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' },
          ],
        });
      } catch (err) {
        console.warn('Failed to set MediaMetadata:', err);
      }
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentSong]);

  // Update MediaSession playback state & position state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if ('setPositionState' in navigator.mediaSession && duration > 0 && isFinite(duration) && isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: audio.playbackRate || 1,
          position: Math.min(currentTime, duration),
        });
      } catch (e) {
        // Ignore edge-case duration sync errors
      }
    }
  }, [isPlaying, currentTime, duration]);

  // Wire MediaSession Action Handlers once
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { audio.play().catch(console.warn); setIsPlaying(true); notifySyncControl('play'); }],
      ['pause', () => { audio.pause(); setIsPlaying(false); notifySyncControl('pause'); }],
      ['previoustrack', () => prev()],
      ['nexttrack', () => next()],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            seek(details.seekTime);
          }
        },
      ],
      [
        'seekbackward',
        (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.max(audio.currentTime - skipTime, 0));
        },
      ],
      [
        'seekforward',
        (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.min(audio.currentTime + skipTime, audio.duration || 0));
        },
      ],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        // Action might not be supported by browser/device version
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {}
      }
    };
  }, [prev, next, seek]);

  const MediaSessionNative = (Capacitor as any).Plugins?.MediaSession;

  // Native Android MediaSession integration via Capacitor plugin
  useEffect(() => {
    if (!MediaSessionNative) return;
    const plugin = MediaSessionNative;

    if (currentSong) {
      let rawArtwork = currentSong.cover_image_url || currentSong.album?.cover_image_url || '';
      let artworkUrl = rawArtwork;
      if (artworkUrl && artworkUrl.startsWith('/')) {
        artworkUrl = window.location.origin + artworkUrl;
      }

      plugin.updateMetadata({
        title: currentSong.title,
        artist: currentSong.artist?.name || 'Unknown Artist',
        album: currentSong.album?.title || 'mumu',
        artworkUrl: artworkUrl || '',
        duration: currentSong.duration || 0,
      }).catch(() => {});
    }
  }, [currentSong]);

  useEffect(() => {
    if (!MediaSessionNative) return;
    const plugin = MediaSessionNative;

    const state = isPlaying ? 'playing' : 'paused';
    plugin.updatePlaybackState({
      state: state,
      position: currentTime,
      duration: duration,
    }).catch(() => {});
  }, [isPlaying, currentTime, duration]);

  useEffect(() => {
    if (!MediaSessionNative) return;
    const plugin = MediaSessionNative;

    const listener = (data: any) => {
      const action = data?.action;
      if (action === 'play') { audio.play().catch(console.warn); setIsPlaying(true); notifySyncControl('play'); }
      else if (action === 'pause') { audio.pause(); setIsPlaying(false); notifySyncControl('pause'); }
      else if (action === 'stop') { audio.pause(); setIsPlaying(false); }
      else if (action === 'next') { next(); }
      else if (action === 'previous') { prev(); }
      else if (action === 'seek' && data?.position !== undefined) { seek(data.position); }
    };

    plugin.addListener('mediaButton', listener);

    return () => {
      plugin.removeListener('mediaButton', listener);
    };
  }, [prev, next, seek]);

  // Handle App backgrounding / minimization and closing
  useEffect(() => {
    const handleAppState = ({ isActive }: { isActive: boolean }) => {
      if (!isActive) {
        // App went to background
        if (!isPlaying_ref.current) {
          audio.pause();
          setIsPlaying(false);
          const plugin = (Capacitor as any).Plugins?.MediaSession;
          if (plugin) {
            plugin.stop().catch(() => {});
          }
        }
      }
    };

    const handleUnload = () => {
      audio.pause();
      setIsPlaying(false);
      const plugin = (Capacitor as any).Plugins?.MediaSession;
      if (plugin) {
        plugin.stop().catch(() => {});
      }
    };

    const listener = CapacitorApp.addListener('appStateChange', handleAppState);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      listener.then((h) => h.remove()).catch(() => {});
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentIndex,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffle,
        playbackError,
        playSong,
        playQueue,
        playNext,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider;
