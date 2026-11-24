import React, { createContext, useContext, useState } from 'react';
import { setCacheLimit } from '../services/offlineCache';

export type AudioQuality = 'original' | 'compressed';

export interface SettingsContextType {
  audioQuality: AudioQuality;
  setAudioQuality: (q: AudioQuality) => void;
  offlineCacheEnabled: boolean;
  setOfflineCacheEnabled: (enabled: boolean) => void;
  cacheLimitBytes: number;
  setCacheLimitBytes: (bytes: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const AUDIO_QUALITY_KEY = 'mumu_audio_quality';
const OFFLINE_CACHE_KEY = 'mumu_offline_cache_enabled';
const CACHE_LIMIT_KEY = 'mumu_cache_limit';
const DEFAULT_CACHE_LIMIT = 2 * 1024 * 1024 * 1024; // 2 GB

// Helper: format bytes for display
export const formatCacheSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i < 2 ? 0 : 2));
  return `${val} ${sizes[i]}`;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioQuality, setAudioQualityState] = useState<AudioQuality>(() => {
    const saved = localStorage.getItem(AUDIO_QUALITY_KEY);
    return (saved as AudioQuality) ?? 'compressed';
  });

  const setAudioQuality = (q: AudioQuality) => {
    setAudioQualityState(q);
    localStorage.setItem(AUDIO_QUALITY_KEY, q);
  };

  const [offlineCacheEnabled, setOfflineCacheEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(OFFLINE_CACHE_KEY);
    return saved === null ? true : saved === 'true';
  });

  const setOfflineCacheEnabled = (enabled: boolean) => {
    setOfflineCacheEnabledState(enabled);
    localStorage.setItem(OFFLINE_CACHE_KEY, String(enabled));
  };

  const [cacheLimitBytes, setCacheLimitBytesState] = useState<number>(() => {
    const saved = localStorage.getItem(CACHE_LIMIT_KEY);
    return saved ? Number(saved) : DEFAULT_CACHE_LIMIT;
  });

  const setCacheLimitBytes = (bytes: number) => {
    setCacheLimitBytesState(bytes);
    localStorage.setItem(CACHE_LIMIT_KEY, String(bytes));
    setCacheLimit(bytes);
  };

  // Sync initial cache limit with the offlineCache service
  React.useEffect(() => {
    setCacheLimit(cacheLimitBytes);
  }, [cacheLimitBytes]);

  return (
    <SettingsContext.Provider
      value={{
        audioQuality,
        setAudioQuality,
        offlineCacheEnabled,
        setOfflineCacheEnabled,
        cacheLimitBytes,
        setCacheLimitBytes,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
