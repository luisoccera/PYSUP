import { sanitizePlainText } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

export const friendRepository = {
  async searchUsers(query: string) {
    const { data, error } = await getSupabase().rpc('search_profiles', { search_query: sanitizePlainText(query, 60), result_limit: 20 });
    if (error) throw error;
    return data ?? [];
  },

  async listFriends() {
    const { data, error } = await getSupabase().rpc('get_my_friends');
    if (error) throw error;
    return data ?? [];
  },

  async listBlocks() {
    const { data, error } = await getSupabase().rpc('get_my_blocks');
    if (error) throw error;
    return data ?? [];
  },

  async listRequests() {
    await requireUserId();
    const { data, error } = await getSupabase().rpc('list_friend_requests');
    if (error) throw error;
    return data ?? [];
  },

  async sendRequest(receiverId: string) {
    const senderId = await requireUserId();
    if (receiverId === senderId) throw new Error('No puedes enviarte una solicitud a ti mismo.');
    const { error } = await getSupabase().from('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId });
    if (error) throw error;
  },

  async respondToRequest(requestId: string, accepted: boolean) {
    const { error } = await getSupabase().rpc('respond_friend_request', { selected_request_id: requestId, accepted });
    if (error) throw error;
  },

  async removeFriend(friendId: string) {
    const { error } = await getSupabase().rpc('remove_friendship', { selected_friend_id: friendId });
    if (error) throw error;
  },

  async blockUser(blockedId: string) {
    const blockerId = await requireUserId();
    const { error } = await getSupabase().from('user_blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) throw error;
  },

  async unblockUser(blockedId: string) {
    const blockerId = await requireUserId();
    const { error } = await getSupabase().from('user_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
    if (error) throw error;
  },

  subscribe(userId: string, onChange: () => void, scope = 'default') {
    const channel = getSupabase().channel(`friend-state:${scope}:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_blocks', filter: `blocker_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
