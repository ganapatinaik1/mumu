import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Check, X, Camera, Loader2, ChevronRight,
  Settings, ShieldCheck, LogOut, Edit2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFriends, useFriendships, useRespondToFriendRequest } from '../hooks/useFriends';
import { updateUserProfile, uploadAvatar } from '../services/profile';

// ─── Settings Row ────────────────────────────────────────────
const Row: React.FC<{
  icon: React.ReactNode; label: string; sub?: string;
  onClick?: () => void; danger?: boolean; badge?: number;
}> = ({ icon, label, sub, onClick, danger, badge }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-white/5 transition-colors text-left"
  >
    <span className={`flex-shrink-0 ${danger ? 'text-red-400' : 'text-zinc-400'}`}>{icon}</span>
    <div className="flex-1 min-w-0">
      <p className={`text-[14px] font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
      {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
    </div>
    {badge != null && badge > 0 && (
      <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {badge}
      </span>
    )}
    <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
  </motion.button>
);

const Divider: React.FC = () => <div className="h-px bg-white/5 mx-4" />;

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mx-4 bg-neutral-900 rounded-2xl overflow-hidden border border-white/5 mb-3 ${className}`}>
    {children}
  </div>
);

// ─── Profile Page ────────────────────────────────────────────
export const Profile: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const nav = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const { friends } = useFriends(user?.id ?? '');
  const { data: allFriendships = [] } = useFriendships(user?.id ?? '');
  const pendingReceived = allFriendships.filter(f => f.status === 'pending' && f.addressee_id === user?.id);
  const respondMut = useRespondToFriendRequest(user?.id ?? '');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      setUploadingAvatar(true);
      setErrorMsg(null);
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      await updateUserProfile(user.id, { avatar_url: url });
      await refreshProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true); setErrorMsg(null);
    try {
      await updateUserProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      await refreshProfile();
      setEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/90 pb-36">
      {/* Hero Header */}
      <div className="relative">
        {/* Gradient bg */}
        <div className="h-36 bg-gradient-to-b from-purple-900/60 to-black" />

        {/* Avatar */}
        <div className="px-4 -mt-16 flex items-end gap-4 pb-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border-4 border-black flex items-center justify-center flex-shrink-0 shadow-xl">
              {uploadingAvatar
                ? <Loader2 className="h-7 w-7 text-purple-400 animate-spin" />
                : avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <User className="h-10 w-10 text-zinc-500" />
              }
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform border-2 border-black"
            >
              <Camera className="h-3.5 w-3.5 text-white" />
            </button>
            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl font-bold text-white truncate leading-tight">
              {profile?.display_name || profile?.username}
            </h1>
            <p className="text-sm text-zinc-400">@{profile?.username}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setEditing(e => !e)}
            className="flex-shrink-0 pb-1 px-3.5 py-2 bg-neutral-800 border border-white/10 rounded-full text-sm font-semibold text-white active:bg-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </motion.button>
        </div>
        </div>

      {/* Edit profile form */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mx-4 mb-4 bg-neutral-900 rounded-2xl border border-white/5 p-4"
        >
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Edit Profile</p>
          <form onSubmit={handleUpdate} className="flex flex-col gap-3">
            {errorMsg && <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs">{errorMsg}</div>}
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={loading}
              placeholder="Display name"
              className="w-full px-4 py-3 bg-neutral-800 border border-white/8 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Your bio…"
              className="w-full px-4 py-3 bg-neutral-800 border border-white/8 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Pending friendship requests */}
      {pendingReceived.length > 0 && (
        <div className="mx-4 mb-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Friend Requests</p>
          <div className="bg-neutral-900 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {pendingReceived.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center">
                  {f.requester?.avatar_url
                    ? <img src={f.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <User className="h-4 w-4 text-zinc-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{f.requester?.display_name || f.requester?.username}</p>
                  <p className="text-xs text-zinc-500">@{f.requester?.username}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => respondMut.mutate({ id: f.id, status: 'accepted' })}
                    className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Check className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={() => respondMut.mutate({ id: f.id, status: 'rejected' })}
                    className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      {friends.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between px-5 mb-2">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Friends</p>
            <button className="text-xs text-purple-400 font-semibold">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-4 scrollbar-none pb-1">
            {friends.map(({ friend }) => (
              <button
                key={friend.id}
                onClick={() => nav(`/user/${friend.username}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 active:opacity-70 transition-opacity"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-800 border-2 border-purple-500/30 flex items-center justify-center">
                  {friend.avatar_url
                    ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <User className="h-6 w-6 text-zinc-500" />
                  }
                </div>
                <p className="text-[10px] text-zinc-400 truncate w-16 text-center">{friend.display_name || friend.username}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings sections */}
      <div className="px-4 mb-2 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Account</p>
      </div>
      <SectionCard>
        <Row icon={<Settings className="h-5 w-5" />} label="Settings" onClick={() => nav('/settings')} />
        {profile?.is_admin && (
          <>
            <Divider />
            <Row
              icon={<ShieldCheck className="h-5 w-5 text-purple-400" />}
              label="Admin Dashboard"
              sub="Manage songs and users"
              onClick={() => nav('/admin')}
            />
          </>
        )}
        <Divider />
        <Row icon={<LogOut className="h-5 w-5" />} label="Sign out" danger onClick={() => signOut()} />
      </SectionCard>
</div>
   );
 };
 export default Profile;
