import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFavoriteSongIds, useToggleFavorite } from '../../hooks/usePlaylists';
import { useAccentTheme } from '../../contexts/AccentThemeContext';

interface FavoriteButtonProps {
  songId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * FavoriteButton — a star toggle that works across the entire app.
 *
 * Uses the shared useFavoriteSongIds query for instant state reflection
 * and optimistic updates via useToggleFavorite.
 *
 * The star is filled when the song is in the user's Favorites collection,
 * outlined otherwise. Smooth scale + opacity animation on state change.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ songId, size = 'md', className = '' }) => {
  const { user } = useAuth();
  const { data: favoriteIds } = useFavoriteSongIds(user?.id);
  const toggleMutation = useToggleFavorite(user?.id);
  const { accentHex } = useAccentTheme();

  const isFavorited = favoriteIds?.has(songId) ?? false;

  const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    toggleMutation.mutate({ songId });
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={!user || toggleMutation.isPending}
      className={`flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${className}`}
      whileTap={{ scale: 0.85 }}
      animate={isFavorited ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {isFavorited ? (
        <Star
          className={`${sizeMap[size]} accent-transition`}
          style={{ color: accentHex, fill: accentHex }}
        />
      ) : (
        <Star
          className={`${sizeMap[size]} text-zinc-500 fill-transparent`}
        />
      )}
    </motion.button>
  );
};
