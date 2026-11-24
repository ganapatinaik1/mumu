import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import type { AudioQuality } from '../contexts/SettingsContext';
import {
  getCacheSize,
  getCachedSongCount,
  clearAllCache,
  formatCacheSize,
} from '../services/offlineCache';

// ─── Section Card ────────────────────────────────────────────
const SectionCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-4 mb-3 bg-neutral-900 rounded-2xl overflow-hidden border border-white/5">
    {children}
  </div>
);

const SectionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  rightNode?: React.ReactNode;
}> = ({ icon, label, sub, onClick, rightNode }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-white/5 transition-colors text-left"
  >
    <span className="flex-shrink-0 text-zinc-400">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-medium text-white">{label}</p>
      {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
    </div>
    {rightNode ?? <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />}
  </motion.button>
);

const Divider: React.FC = () => <div className="h-px bg-white/5 mx-4" />;

// Toggle row for on/off settings
const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, sub, value, onChange }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={() => onChange(!value)}
    className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-white/5 transition-colors text-left"
  >
    <span className="flex-shrink-0 text-zinc-400">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-medium text-white">{label}</p>
      {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
    </div>
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!value);
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-purple-600' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : ''
        }`}
      />
    </div>
  </motion.button>
);

// ─── Audio Quality Setting ───────────────────────────────────
const AudioQualitySetting: React.FC = () => {
  const { audioQuality, setAudioQuality } = useSettings();

  return (
    <div>
      <p className="text-sm font-bold text-white mb-1">Audio Quality</p>
      <p className="text-xs text-zinc-500 mb-3">Choose between smaller file size or lossless original quality. Compressed uses ~96 kbps Opus (very efficient, near-lossless for most ears).</p>
      <div className="flex gap-2">
        {(['compressed', 'original'] as AudioQuality[]).map((q) => (
          <button
            key={q}
            onClick={() => setAudioQuality(q)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              audioQuality === q
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                : 'bg-neutral-800 text-zinc-400 border-white/5 hover:text-white'
            }`}
          >
            {q === 'compressed' ? '⚡ Compressed (96kbps)' : '🎚️ Original Quality'}
          </button>
        ))}
      </div>
      {audioQuality === 'compressed' && (
        <p className="text-[11px] text-purple-400 mt-2 font-medium">✓ Faster loading · Less data usage · Recommended</p>
      )}
      {audioQuality === 'original' && (
        <p className="text-[11px] text-zinc-400 mt-2">Original file – uses more data but unmodified quality</p>
      )}
    </div>
  );
};

// ─── Settings Page ────────────────────────────────────────────
export const Settings: React.FC = () => {
  const nav = useNavigate();
  const {
    offlineCacheEnabled,
    setOfflineCacheEnabled,
    cacheLimitBytes,
  } = useSettings();

  const [cacheSize, setCacheSize] = useState(0);
  const [cachedSongCount, setCachedSongCount] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);

  const refreshCacheStats = useCallback(() => {
    setCacheSize(getCacheSize());
    setCachedSongCount(getCachedSongCount());
  }, []);

  const handleClearCache = useCallback(async () => {
    setClearingCache(true);
    try {
      await clearAllCache();
      refreshCacheStats();
    } catch {
      // Silently fail
    } finally {
      setClearingCache(false);
    }
  }, [refreshCacheStats]);

  // Refresh cache stats on mount and when cache is toggled
  useEffect(() => {
    refreshCacheStats();
  }, [offlineCacheEnabled, refreshCacheStats]);

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => nav(-1)}
            className="p-2 -ml-2 text-zinc-300 active:text-white rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Playback Section */}
      <div className="px-4 mb-2 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Playback</p>
      </div>
      <SectionCard>
        <div className="p-4">
          <AudioQualitySetting />
        </div>
      </SectionCard>

      {/* Appearance Section (placeholder) */}
      <div className="px-4 mb-2 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Appearance</p>
      </div>
      <SectionCard>
        <SectionRow
          icon={null}
          label="Dark Mode"
          sub="Coming soon"
          rightNode={<span className="text-xs text-zinc-600">—</span>}
        />
      </SectionCard>

      {/* Storage Section */}
      <div className="px-4 mb-2 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Storage</p>
      </div>
      <SectionCard>
        <ToggleRow
          icon={null}
          label="Offline Streaming Cache"
          sub="Cache streamed songs for offline playback"
          value={offlineCacheEnabled}
          onChange={setOfflineCacheEnabled}
        />
        <Divider />
        <div className="px-4 py-3.5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Cache Size Used</p>
          <p className="text-sm font-medium text-white">
            {formatCacheSize(cacheSize)} / {formatCacheSize(cacheLimitBytes)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{cachedSongCount} songs cached</p>
        </div>
        <Divider />
        <button
          onClick={handleClearCache}
          disabled={cacheSize === 0 || clearingCache}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 text-sm font-medium active:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearingCache ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Clear Cache
        </button>
      </SectionCard>

      {/* About Section */}
      <div className="px-4 mb-2 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">About</p>
      </div>
      <SectionCard>
        <SectionRow
          icon={null}
          label="App Version"
          sub="1.0.0"
          rightNode={<span className="text-xs text-zinc-600">—</span>}
        />
      </SectionCard>
    </div>
  );
};

export default Settings;
