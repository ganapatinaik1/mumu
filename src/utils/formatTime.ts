/**
 * Format a number of seconds into m:ss or h:mm:ss display string.
 */
export const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Format a nullable duration (from DB, may be null) into display string.
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null) return '--:--';
  return formatTime(seconds);
};

/**
 * Get a greeting string based on the current hour.
 */
export const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Resolve the best available cover image for a song.
 * Song-level cover overrides album cover.
 */
export const resolveCover = (song: {
  cover_image_url?: string | null;
  album?: { cover_image_url?: string | null } | null;
}): string | null => {
  return song.cover_image_url ?? song.album?.cover_image_url ?? null;
};
