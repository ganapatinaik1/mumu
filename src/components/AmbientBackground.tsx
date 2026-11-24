import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../hooks/usePlayer';
import { resolveCover } from '../utils/formatTime';
import { useAccentColor } from '../hooks/useAccentColor';

/**
 * AmbientBackground
 *
 * Renders a huge blurred mesh gradient behind the entire application,
 * derived from the currently playing album artwork's dominant color.
 *
 * Uses the same useAccentColor hook as FullScreenPlayer for color extraction
 * and caching. Crossfades between color palettes on song change (400ms).
 */
export const AmbientBackground: React.FC = () => {
  const { currentSong } = usePlayer();
  const coverUrl = currentSong ? resolveCover(currentSong) : null;

  // Use the same accent color extraction as FullScreenPlayer
  const accentHex = useAccentColor(coverUrl);

  // Convert hex to RGB string for use in rgba() templates
  const accentRgb = useMemo(() => {
    const clean = accentHex.replace('#', '');
    const bigint = parseInt(clean, 16);
    if (isNaN(bigint)) return '139, 92, 246';
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }, [accentHex]);

  // Generate CSS gradient from the single dominant color
  const gradientStyle = useMemo(() => {
    return {
      backgroundImage: `
        radial-gradient(ellipse at 20% 30%, rgba(${accentRgb}, 0.20) 0%, transparent 65%),
        radial-gradient(ellipse at 80% 30%, rgba(${accentRgb}, 0.15) 0%, transparent 65%),
        radial-gradient(ellipse at 50% 60%, rgba(${accentRgb}, 0.12) 0%, transparent 65%),
        linear-gradient(180deg, transparent 0%, transparent 55%, rgba(0,0,0,0.85) 100%)
      `,
    };
  }, [accentRgb]);

  return (
    <motion.div
      className="fixed inset-0 -z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence>
        <motion.div
          key={coverUrl || 'default'}
          className="absolute inset-0"
          style={{
            ...gradientStyle,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55" />
    </motion.div>
  );
};
