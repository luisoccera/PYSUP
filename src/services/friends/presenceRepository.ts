import { getSupabase } from '../supabase/client';

export const presenceRepository = {
  subscribe(userId: string, friendIds: string[], onChange: (onlineUserIds: string[]) => void) {
    const supabase = getSupabase();
    const online = new Set<string>();
    const channels = [...new Set([userId, ...friendIds])].map((ownerId) => {
    const channel = supabase.channel(`presence:${ownerId}`, { config: { private: true, presence: { key: userId } } })
      .on('presence', { event: 'sync' }, () => {
        // La identidad viene del topic autorizado por RLS, no de un payload editable.
        if (Object.values(channel.presenceState()).some((entries) => entries.length > 0)) online.add(ownerId);
        else online.delete(ownerId);
        onChange([...online]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && ownerId === userId) {
          void channel.track({ online_at: new Date().toISOString() });
          void supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          online.delete(ownerId); onChange([...online]);
        }
      });
    return channel;
    });
    return () => { channels.forEach((channel) => { void supabase.removeChannel(channel); }); };
  },
};
