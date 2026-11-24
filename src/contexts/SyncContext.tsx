import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { audio } from './PlayerContext';
import type { Profile } from '../types';

export interface SyncSession {
  id: string;
  host_id: string;
  guest_id: string;
  status: 'pending' | 'active' | 'ended' | 'declined';
  created_at?: string;
  updated_at?: string;
  host?: Profile;
  guest?: Profile;
}

interface SyncContextType {
  activeSession: SyncSession | null;
  connectedFriend: Profile | null;
  isController: boolean;
  createSession: (friendId: string) => Promise<void>;
  requestSyncInvite: (friendId: string) => Promise<void>;
  acceptSession: (sessionId: string) => Promise<void>;
  declineSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  pendingRequests: SyncSession[];
  sentRequests: SyncSession[];
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Helper to safely enrich host & guest profiles without relying on brittle DB joins
const enrichSession = async (session: any): Promise<SyncSession | null> => {
  if (!session) return null;
  let host = session.host;
  let guest = session.guest;

  const idsToFetch: string[] = [];
  if (!host && session.host_id) idsToFetch.push(session.host_id);
  if (!guest && session.guest_id && !idsToFetch.includes(session.guest_id)) idsToFetch.push(session.guest_id);

  if (idsToFetch.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', idsToFetch);

    if (profiles && profiles.length > 0) {
      if (!host) host = profiles.find((p) => p.id === session.host_id);
      if (!guest) guest = profiles.find((p) => p.id === session.guest_id);
    }
  }

  return {
    ...session,
    host,
    guest,
  };
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { playSong, playQueue, currentSong, queue, isPlaying } = usePlayer();
  const [activeSession, setActiveSession] = useState<SyncSession | null>(null);
  const [pendingRequests, setPendingRequests] = useState<SyncSession[]>([]);
  const [sentRequests, setSentRequests] = useState<SyncSession[]>([]);

  const channelRef = useRef<any>(null);
  const ignoreNextEvent = useRef(false);
  const localUserPaused = useRef(false);
  const currentSongRef = useRef(currentSong);
  const queueRef = useRef(queue);
  const isPlayingRef = useRef(isPlaying);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Clear pending fetch timer when user changes
  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [user]);

  const connectedFriend = activeSession
    ? activeSession.host_id === user?.id
      ? activeSession.guest || null
      : activeSession.host || null
    : null;

  // Both connected users are equal co-controllers in collaborative sync!
  const isController = true;

  // Bi-directional state broadcast to channel
  const broadcastSyncState = useCallback(
    (type: string, extraData?: any) => {
      const song = currentSongRef.current;
      if (!channelRef.current || !activeSession || !song || !user) return;

      const payload = {
        type,
        senderId: user.id,
        song,
        queue: type === 'heartbeat' ? undefined : queueRef.current,
        isPlaying: isPlayingRef.current,
        currentTime: audio.currentTime,
        timestamp: Date.now(),
        ...extraData,
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'sync_state',
        payload,
      });
    },
    [activeSession?.id, user?.id]
  );

  const leaveChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Fetch active, pending & sent requests (debounced to prevent race conditions)
  const fetchPendingAndSent = useCallback(async () => {
    if (!user) return;

    // Debounce: clear any pending fetch and schedule a new one
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(async () => {
      try {
        // Pending requests received (guest = user, status = pending)
        const { data: pendingData } = await supabase
          .from('sync_sessions')
          .select('*')
          .eq('guest_id', user.id)
          .eq('status', 'pending');

        if (pendingData && pendingData.length > 0) {
          const enrichedPending = await Promise.all(pendingData.map(enrichSession));
          setPendingRequests(enrichedPending.filter(Boolean) as SyncSession[]);
        } else {
          setPendingRequests([]);
        }

        // Sent requests (host = user, status = pending)
        const { data: sentData } = await supabase
          .from('sync_sessions')
          .select('*')
          .eq('host_id', user.id)
          .eq('status', 'pending');

        if (sentData && sentData.length > 0) {
          const enrichedSent = await Promise.all(sentData.map(enrichSession));
          setSentRequests(enrichedSent.filter(Boolean) as SyncSession[]);
        } else {
          setSentRequests([]);
        }

        // Also refresh active session so the host sees it immediately
        const { data: activeData } = await supabase
          .from('sync_sessions')
          .select('*')
          .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeData) {
          const enriched = await enrichSession(activeData);
          if (enriched) setActiveSession(enriched);
        } else {
          setActiveSession(null);
        }
      } catch (err) {
        console.error('Error fetching sync requests:', err);
      }
    }, 300);
  }, [user]);

  // Restore active session on mount
  useEffect(() => {
    if (!user) return;

    const restoreActiveSession = async () => {
      try {
        const { data } = await supabase
          .from('sync_sessions')
          .select('*')
          .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const enriched = await enrichSession(data);
          if (enriched) setActiveSession(enriched);
        }
      } catch (err) {
        console.error('Error restoring active session:', err);
      }
    };

    restoreActiveSession();
    fetchPendingAndSent();
  }, [user, fetchPendingAndSent]);

  // Real-time listener & 5s polling fallback for sync invitations
  useEffect(() => {
    if (!user) return;

    fetchPendingAndSent();

    const interval = setInterval(() => {
      fetchPendingAndSent();
    }, 5000);

    const sub = supabase
      .channel(`sync_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_sessions',
          filter: `or(guest_id.eq.${user.id},host_id.eq.${user.id})`,
        },
        () => {
          fetchPendingAndSent();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, [user, fetchPendingAndSent]);

  // Subscribe to real-time channel when active session exists
  useEffect(() => {
    if (!activeSession || !user || activeSession.status !== 'active') {
      leaveChannel();
      return;
    }

    const channel = supabase.channel(`sync:${activeSession.id}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        // Ignore self-broadcasts or invalid payload
        if (!payload || !payload.song || payload.senderId === user.id) return;

        if (payload.type === 'resync-request') {
          broadcastSyncState('resync-response');
          return;
        }

        const networkDelay = (Date.now() - payload.timestamp) / 1000;
        const targetTime = payload.isPlaying
          ? payload.currentTime + (networkDelay > 0 && networkDelay < 5 ? networkDelay : 0)
          : payload.currentTime;

        ignoreNextEvent.current = true;

        let remoteStateApplied = false;
        const applyRemoteState = () => {
          if (remoteStateApplied) return;
          remoteStateApplied = true;
          if (Math.abs(audio.currentTime - targetTime) > 0.35) {
            audio.currentTime = Math.max(0, targetTime);
          }
          if (payload.isPlaying && audio.paused) {
            audio.play().catch(console.warn);
          } else if (!payload.isPlaying && !audio.paused) {
            audio.pause();
          }
          setTimeout(() => { ignoreNextEvent.current = false; }, 800);
        };

        if (currentSongRef.current?.id !== payload.song.id) {
          const q = payload.queue && payload.queue.length > 0 ? payload.queue : [payload.song];
          audio.addEventListener('loadedmetadata', applyRemoteState, { once: true });
          playSong(payload.song, q);
          setTimeout(applyRemoteState, 1200);
        } else {
          applyRemoteState();
        }
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        // Another participant left — clear session immediately
        if (payload?.userId === user.id) return;
        setActiveSession(null);
        leaveChannel();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          broadcastSyncState('init');
        }
      });

    return () => {
      leaveChannel();
    };
  }, [
    activeSession?.id,
    user,
    leaveChannel,
    broadcastSyncState,
    playQueue,
    playSong,
  ]);

  // Track and broadcast only deliberate playback actions. Browser-induced pauses
  // (for example, another app taking audio focus) stay local to this device.
  useEffect(() => {
    const onSyncControl = (event: Event) => {
      if (!activeSession || ignoreNextEvent.current) return;
      const action = (event as CustomEvent<{ action: 'play' | 'pause' }>).detail?.action;
      if (!action) return;
      localUserPaused.current = action === 'pause';
      broadcastSyncState(action, { isPlaying: action === 'play', currentTime: audio.currentTime });
    };

    window.addEventListener('mumu-sync-control', onSyncControl);
    return () => window.removeEventListener('mumu-sync-control', onSyncControl);
  }, [activeSession, broadcastSyncState]);

  // Track changes are still collaborative, but automatic pause events are not.
  useEffect(() => {
    if (!activeSession || ignoreNextEvent.current) return;
    broadcastSyncState('track-change');
  }, [currentSong?.id, activeSession, broadcastSyncState]);

  // After an interruption, ask the other peer for its latest shared state.
  useEffect(() => {
    if (!activeSession) return;
    const onVisibilityChange = () => {
      if (!document.hidden && !localUserPaused.current && audio.paused) {
        broadcastSyncState('resync-request');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [activeSession, broadcastSyncState]);

  // Broadcast seek events
  useEffect(() => {
    if (!activeSession) return;
    const onSeeked = () => {
      if (!ignoreNextEvent.current) {
        broadcastSyncState('seek');
      }
    };
    audio.addEventListener('seeked', onSeeked);
    return () => audio.removeEventListener('seeked', onSeeked);
  }, [activeSession, broadcastSyncState]);

  // Frequent position heartbeats keep both peers within a fraction of a second.
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      if (isPlayingRef.current && !ignoreNextEvent.current) {
        broadcastSyncState('heartbeat');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeSession?.id, broadcastSyncState]);

  // Actions
  const createSession = async (friendId: string) => {
    if (!user) return;

    // Check if session already exists
    const { data: existing } = await supabase
      .from('sync_sessions')
      .select('*')
      .or(`and(host_id.eq.${user.id},guest_id.eq.${friendId}),and(host_id.eq.${friendId},guest_id.eq.${user.id})`)
      .in('status', ['pending', 'active'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        const enriched = await enrichSession(existing);
        if (enriched) setActiveSession(enriched);
        return;
      }
      await fetchPendingAndSent();
      return;
    }

    const { error } = await supabase
      .from('sync_sessions')
      .insert({ host_id: user.id, guest_id: friendId, status: 'pending' });

    if (error) {
      console.error('Failed to create sync session:', error.message);
      alert(`Could not send sync invite: ${error.message}`);
      throw error;
    }

    await fetchPendingAndSent();
  };

  const requestSyncInvite = async (friendId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('sync_sessions')
      .insert({ host_id: friendId, guest_id: user.id, status: 'pending' });

    if (error) throw error;
    fetchPendingAndSent();
  };

  const acceptSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('sync_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) throw error;
    const enriched = await enrichSession(data);
    if (enriched) {
      setActiveSession(enriched);
    }
    fetchPendingAndSent();
  };

  const declineSession = async (sessionId: string) => {
    await supabase.from('sync_sessions').update({ status: 'declined' }).eq('id', sessionId);
    if (activeSession?.id === sessionId) setActiveSession(null);
    fetchPendingAndSent();
  };

  const cancelSession = async (sessionId: string) => {
    await supabase.from('sync_sessions').delete().eq('id', sessionId);
    if (activeSession?.id === sessionId) setActiveSession(null);
    fetchPendingAndSent();
  };

  const leaveSession = async () => {
    if (activeSession) {
      // Notify peer immediately via broadcast before DB update
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'user-left',
          payload: { userId: user.id },
        }).catch(() => {});
      }

      await supabase.from('sync_sessions').update({ status: 'ended' }).eq('id', activeSession.id);
    }
    setActiveSession(null);
    leaveChannel();
    fetchPendingAndSent();
  };

  // DB update listener for current active session
  useEffect(() => {
    if (!user || !activeSession) return;

    const sub = supabase
      .channel(`sync_db_changes:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_sessions',
          filter: `id=eq.${activeSession.id}`,
        },
        async (payload) => {
          if (payload.new.status === 'ended' || payload.new.status === 'declined') {
            setActiveSession(null);
            leaveChannel();
          } else if (payload.new.status === 'active') {
            const enriched = await enrichSession(payload.new);
            if (enriched) setActiveSession(enriched);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user, activeSession?.id, leaveChannel]);

  return (
    <SyncContext.Provider
      value={{
        activeSession,
        connectedFriend,
        isController,
        createSession,
        requestSyncInvite,
        acceptSession,
        declineSession,
        cancelSession,
        leaveSession,
        pendingRequests,
        sentRequests,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
