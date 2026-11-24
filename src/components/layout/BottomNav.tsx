import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Library, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccentTheme } from '../../contexts/AccentThemeContext';

const NAV_ITEMS = [
  { to: '/',        icon: Home,    label: 'Home'    },
  { to: '/search',  icon: Search,  label: 'Search'  },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/profile', icon: User,    label: 'You'     },
];

export const BottomNav: React.FC = () => {
  const { accentHex, accentRgb } = useAccentTheme();

  return (
    <nav className="w-[92%]">
      <div
        className="flex items-center justify-around rounded-full px-3 py-1 shadow-xl"
        style={{
          backgroundColor: 'rgba(18, 18, 18, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset`,
        }}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 relative flex flex-col items-center justify-center py-2 transition-colors"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-x-2 inset-y-0.5 rounded-full accent-transition"
                    style={{
                      backgroundColor: `rgba(${accentRgb}, 0.18)`,
                      boxShadow: `0 0 12px rgba(${accentRgb}, 0.15)`,
                    }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                  />
                )}
                <motion.div
                  className={`relative flex flex-col items-center gap-0.5 ${isActive ? '' : 'text-zinc-500'}`}
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon
                    className="h-[18px] w-[18px] accent-transition"
                    style={isActive ? { color: accentHex } : {}}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <motion.span
                    className="text-[8px] font-semibold tracking-wide accent-transition"
                    animate={{ opacity: isActive ? 1 : 0.7 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    style={isActive ? { color: accentHex } : {}}
                  >
                    {label}
                  </motion.span>
                </motion.div>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
