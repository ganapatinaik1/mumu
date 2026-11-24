import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Calendar, ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPublicProfile } from '../services/users';
import { FriendButton } from '../components/social/FriendButton';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../hooks/useAuth';


const FriendsList: React.FC<{ userId: string }> = ({ userId }) => {
  const { friends, isLoading } = useFriends(userId);
  const nav = useNavigate();

  if (isLoading) return <div className="h-10 bg-neutral-900 rounded-xl animate-pulse" />;
  if (friends.length === 0) return <p className="text-zinc-500 text-sm">No friends yet.</p>;

  return (
    <div className="flex flex-col gap-1">
      {friends.map(({ friend }) => (
        <button
          key={friend.id}
          onClick={() => nav(`/user/${friend.username}`)}
          className="flex items-center gap-3 p-3 rounded-xl active:bg-white/5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-white/5">
            {friend.avatar_url
              ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
              : <User className="h-4 w-4 text-zinc-500" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{friend.display_name || friend.username}</p>
            <p className="text-xs text-zinc-500">@{friend.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const nav = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['user_profile', username],
    queryFn: () => getPublicProfile(username!),
    enabled: Boolean(username),
    staleTime: 1000 * 60,
  });

  const isOwnProfile = profile && user?.id === profile.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/90 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-black/90 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-white font-semibold">User not found</p>
        <button onClick={() => nav(-1)} className="text-purple-400 text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/90 pb-32">
      {/* Back button */}
      <div className="flex items-center gap-2 px-4 pt-safe pt-4 pb-2">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 text-zinc-400 active:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-zinc-400">@{profile.username}</span>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center px-6 py-6 text-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border-2 border-purple-500/40 flex items-center justify-center mb-4 shadow-xl shadow-purple-900/20">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            : <User className="h-10 w-10 text-purple-400/60" />
          }
        </div>
        <h1 className="text-2xl font-extrabold font-outfit text-white">{profile.display_name || profile.username}</h1>
        <p className="text-sm text-zinc-400 mt-0.5">@{profile.username}</p>
        {profile.bio && <p className="text-sm text-zinc-300 mt-3 max-w-xs">{profile.bio}</p>}

        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
          <Calendar className="h-3.5 w-3.5" />
          Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>

        {!isOwnProfile && (
          <div className="mt-4 flex items-center gap-2">
            <FriendButton targetUserId={profile.id} />
            <button
              onClick={() => nav('/sync')}
              className="px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5" /> Sync Music
            </button>
          </div>
        )}
      </div>

      {/* Friends */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-white">Friends</h2>
        </div>
        <FriendsList userId={profile.id} />
      </section>
    </div>
  );
};

export default UserProfile;
