import { sanitizePlainText } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

export const messageRepository = {
  async getOrCreateConversation(friendId: string) {
    const { data, error } = await getSupabase().rpc('get_or_create_direct_conversation', { other_user_id: friendId });
    if (error) throw error;
    return data as string;
  },

  async listMessages(conversationId: string, before?: string) {
    let request = getSupabase().from('direct_messages').select('*').eq('conversation_id', conversationId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50);
    if (before) request = request.lt('created_at', before);
    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []).reverse();
  },

  async send(conversationId: string, textValue: string, clientId: string) {
    const senderId = await requireUserId();
    const body = sanitizePlainText(textValue, 4000);
    if (!body) throw new Error('El mensaje está vacío.');
    const { data, error } = await getSupabase().from('direct_messages').insert({ conversation_id: conversationId, sender_id: senderId, body, client_id: clientId }).select('*').single();
    if (error) throw error;
    return data;
  },

  async markRead(conversationId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('direct_messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', userId).is('read_at', null);
    if (error) throw error;
  },

  subscribe(conversationId: string, onMessage: (message: Record<string, unknown>) => void) {
    const channel = getSupabase().channel(`direct:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => onMessage(payload.new))
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },

  trackPresence(userId: string) {
    const channel = getSupabase().channel('pysup:presence', { config: { presence: { key: userId } } });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ user_id: userId, online_at: new Date().toISOString() });
    });
    return channel;
  },
};
