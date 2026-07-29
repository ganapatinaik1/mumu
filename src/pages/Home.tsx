import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateUserProfile } from '../services/profile';
import { 
  Music, LogOut, User, FileText, Check, Settings, 
  ShieldCheck, Calendar, Activity, Edit3, Image
} from 'lucide-react';
import { SupabaseWarning } from '../components/SupabaseWarning';

export const Home: React.FC = () => {
  const { user, profile, refreshProfile, signOut, isConfigured } = useAuth();
  
  // Edit Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Status flags
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state with profile once loaded
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  if (!isConfigured) {
    return <SupabaseWarning />;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      await updateUserProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setErrorMsg(err.message || 'Failed to update profile information.');
    } finally {
      setLoading(false);
    }
  };

  const setRandomAvatar = () => {
    const randomId = Math.floor(Math.random() * 1000);
    setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${randomId}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-radial-gradient py-10 px-4 sm:px-6 lg:px-8">
      {/* Header bar */}
      <nav className="max-w-6xl mx-auto glass-card rounded-2xl py-4 px-6 border border-white/5 flex justify-between items-center mb-10 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-500/20">
            <Music className="h-5 w-5 text-purple-400" />
          </div>
          <span className="font-outfit font-extrabold text-xl tracking-tight text-white">
            MUMU <span className="text-purple-400 font-medium text-sm">Studio</span>
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 hover:bg-neutral-800 bg-neutral-900 border border-white/5 px-4.5 py-2.5 rounded-xl text-zinc-300 hover:text-white text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:border-purple-500/30"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </nav>

      {/* Main Board Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card Summary Panel */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-card music-glow rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col items-center">
            {/* Avatar block */}
            <div className="relative mb-5 group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-purple-500 bg-neutral-900 flex items-center justify-center shadow-lg">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name || profile.username} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="h-12 w-12 text-purple-400/80" />
                )}
              </div>
              {profile?.is_admin && (
                <div className="absolute -bottom-2 -right-1 bg-purple-600 border border-purple-405 text-white p-1.5 rounded-full shadow-md" title="Admin User">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold font-outfit text-white leading-tight">
              {profile?.display_name || 'Guest User'}
            </h2>
            <p className="text-purple-400 text-sm font-mono mt-1">@{profile?.username || 'unknown'}</p>

            <span className="mt-4 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-1.5 uppercase">
              <Activity className="h-3 w-3 text-purple-400" />
              Creator Session Active
            </span>

            {/* Profile Fields Info */}
            <div className="w-full border-t border-white/5 mt-6 pt-5 space-y-4 text-sm text-zinc-400">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-zinc-500"><FileText className="h-3.5 w-3.5" /> Bio</span>
                <span className="text-zinc-300 block max-w-[180px] text-right truncate" title={profile?.bio || 'No bio written yet'}>
                  {profile?.bio || 'No bio written yet'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-zinc-500"><Calendar className="h-3.5 w-3.5" /> Established</span>
                <span className="text-zinc-300 font-mono">
                  {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-zinc-500"><Settings className="h-3.5 w-3.5" /> Account ID</span>
                <span className="text-zinc-300 font-mono text-[9px] truncate max-w-[80px]" title={user?.id}>
                  {user?.id ? `${user.id.substring(0, 8)}...` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Update Profile Panel */}
        <section className="lg:col-span-2">
          <div className="glass-card music-glow rounded-3xl p-8 border border-white/5 shadow-xl">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="bg-purple-900/40 p-2 rounded-xl border border-purple-500/20 text-purple-400">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit text-white">Customize Studio Profile</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Customize how your public card displays to other curators in search results.</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-4 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              {success && (
                <div className="bg-green-950/40 border border-green-500/30 text-green-200 p-4 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Display Name input */}
                <div>
                  <label htmlFor="editDisplayName" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Studio Display Name
                  </label>
                  <input
                    id="editDisplayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter artist name"
                    disabled={loading}
                    className="block w-full px-4 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                  />
                </div>

                {/* Avatar URL input */}
                <div>
                  <label htmlFor="editAvatar" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Avatar Image URL
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Image className="h-4 w-4" />
                      </div>
                      <input
                        id="editAvatar"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://assets.site/avatar.jpg"
                        disabled={loading}
                        className="block w-full pl-9 pr-4 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={setRandomAvatar}
                      title="Generate random identicon SVG"
                      className="px-3 bg-neutral-800 hover:bg-neutral-700 border border-white/5 text-purple-400 font-semibold rounded-xl text-xs transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      Randomize
                    </button>
                  </div>
                </div>
              </div>

              {/* Bio description input */}
              <div>
                <label htmlFor="editBio" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Artist Autobiography / Biography
                </label>
                <textarea
                  id="editBio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short bio with listeners..."
                  disabled={loading}
                  className="block w-full px-4 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200 resize-none font-sans"
                />
              </div>

              {/* Submit update */}
              <button
                type="submit"
                disabled={loading}
                className="w-fit flex justify-center items-center py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-purple-500/10 active:scale-[0.99] ml-auto border border-purple-500/20"
              >
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  );
};
