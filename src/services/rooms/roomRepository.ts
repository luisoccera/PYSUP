import { sanitizePlainText } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

export type RoomPlaybackEvent = 'play' | 'pause' | 'seek' | 'rewind' | 'forward' | 'sync';

export const roomRepository = {
  async get(roomId: string) {
    const { data, error } = await getSupabase().from('rooms').select('*').eq('id', roomId).single();
    if (error) throw error;
    return data;
  },

  async getActiveForUser() {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('room_participants').select('role,rooms!inner(*)').eq('user_id', userId).is('left_at', null).eq('rooms.status', 'open').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    const room = data?.rooms as unknown as Record<string, unknown> | null;
    return room ? { room, role: String(data?.role ?? 'participant') } : null;
  },

  async create(titleValue: string, contentId?: string) {
    const hostId = await requireUserId();
    const title = sanitizePlainText(titleValue, 100);
    if (!title) throw new Error('La sala necesita un título.');
    const { data, error } = await getSupabase().from('rooms').insert({ host_id: hostId, title, content_id: contentId ?? null }).select('*').single();
    if (error) throw error;
    return data;
  },

  async invite(roomId: string, invitedUserId: string) {
    const inviterId = await requireUserId();
    const { error } = await getSupabase().from('room_invitations').insert({ room_id: roomId, inviter_id: inviterId, invited_user_id: invitedUserId });
    if (error) throw error;
  },

  async respondToInvite(invitationId: string, accepted: boolean) {
    const { data, error } = await getSupabase().rpc('respond_room_invitation', { selected_invitation_id: invitationId, accepted });
    if (error) throw error;
    return data;
  },

  async joinByCode(inviteCode: string) {
    const { data, error } = await getSupabase().rpc('join_room_by_code', { selected_invite_code: inviteCode.trim() });
    if (error) throw error;
    return data as string;
  },

  async leave(roomId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('room_participants').update({ left_at: new Date().toISOString() }).eq('room_id', roomId).eq('user_id', userId).is('left_at', null);
    if (error) throw error;
  },

  async close(roomId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', roomId).eq('host_id', userId);
    if (error) throw error;
  },

  async sendChat(roomId: string, textValue: string, clientId: string) {
    const actorId = await requireUserId();
    const body = sanitizePlainText(textValue, 4000);
    if (!body) throw new Error('El mensaje está vacío.');
    const { data, error } = await getSupabase().from('room_events').insert({ room_id: roomId, actor_id: actorId, event_type: 'chat', payload: { body, client_id: clientId } }).select('*').single();
    if (error) throw error;
    return data;
  },

  async sendPlayback(roomId: string, eventType: RoomPlaybackEvent, positionMs: number, playing: boolean, sequence: number) {
    const actorId = await requireUserId();
    const { data, error } = await getSupabase().from('room_events').insert({
      room_id: roomId,
      actor_id: actorId,
      event_type: eventType,
      payload: { position_ms: Math.max(0, Math.round(positionMs)), playing, sequence },
      client_occurred_at: new Date().toISOString(),
    }).select('*,server_occurred_at').single();
    if (error) throw error;
    return data;
  },

  async listEvents(roomId: string, after?: string) {
    let request = getSupabase().from('room_events').select('*').eq('room_id', roomId).order('server_occurred_at', { ascending: true }).limit(200);
    if (after) request = request.gt('server_occurred_at', after);
    const { data, error } = await request;
    if (error) throw error;
    return data ?? [];
  },

  subscribe(roomId: string, onEvent: (event: Record<string, unknown>) => void) {
    const channel = getSupabase().channel(`room:${roomId}`, { config: { presence: { key: roomId } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` }, (payload) => onEvent(payload.new))
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
