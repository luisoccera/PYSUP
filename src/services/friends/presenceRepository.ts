import { getSupabase } from '../supabase/client';

type PresencePayload = { user_id?: string; online_at?: string };

export const presenceRepository = {
  subscribe(userId: string, onChange: (onlineUserIds: string[]) => void) {
    const supabase = getSupabase();
    const channel = supabase.channel('pysup:online-users', { config: { presence: { key: userId } } })
      .on('presence', { event: 'sync' }, () => {
        const ids = Object.values(channel.presenceState<PresencePayload>())
          .flat()
          .flatMap((presence) => presence.user_id ? [presence.user_id] : []);
        onChange([...new Set(ids)]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ user_id: userId, online_at: new Date().toISOString() });
          void supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId);
        }
      });
    return () => { void supabase.removeChannel(channel); };
  },
};
