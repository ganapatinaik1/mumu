import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Home, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const navLink = (href: string, label: string, Icon: React.FC<{ className?: string }>) => {
    const active = location.pathname === href;
    return (
      <Link
        to={href}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="glass-card rounded-2xl py-3 px-5 border border-white/5 flex justify-between items-center mb-8 shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-900/40 p-2 rounded-xl border border-purple-500/20">
          <Music className="h-5 w-5 text-purple-400" />
        </div>
        <span className="font-outfit font-extrabold text-lg tracking-tight text-white">
          MUMU <span className="text-purple-400 font-medium text-xs">Studio</span>
        </span>
      </div>

      {/* Links */}
      <div className="hidden sm:flex items-center gap-1">
        {navLink('/', 'Home', Home)}
        {navLink('/profile', 'Profile', User)}
      </div>

      {/* User + Logout */}
      <div className="flex items-center gap-3">
        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? profile.username}
            className="w-7 h-7 rounded-full border border-purple-500/40 object-cover hidden sm:block"
          />
        )}
        <span className="text-xs text-zinc-400 hidden sm:block truncate max-w-[100px]">
          @{profile?.username ?? '…'}
        </span>
        <button
          onClick={signOut}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 hover:border-purple-500/30 rounded-xl text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </nav>
  );
};
