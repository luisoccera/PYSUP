import { sanitizePlainText } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

export type ForumTopicRecord = {
  id: string;
  kind: 'discussion' | 'identify';
  title: string;
  body: string;
  contains_spoilers: boolean;
  solved_at: string | null;
  accepted_reply_id: string | null;
  created_at: string;
  author: { id: string; display_name: string; username: string; avatar_path: string | null } | null;
  reply_count?: number;
  like_count?: number;
};

export const forumRepository = {
  async list(query = '') {
    const clean = sanitizePlainText(query, 100);
    const { data, error } = await getSupabase().rpc('list_forum_topics', { search_query: clean, result_limit: 50 });
    if (error) throw error;
    return data as ForumTopicRecord[];
  },

  async create(input: { kind: 'discussion' | 'identify'; title: string; body: string; spoiler?: boolean }) {
    const userId = await requireUserId();
    const title = sanitizePlainText(input.title, 160);
    const body = sanitizePlainText(input.body, 6000);
    if (title.length < 5 || body.length < 10) throw new Error('Escribe un título y una descripción más detallados.');
    const { data, error } = await getSupabase().from('forum_topics').insert({
      author_id: userId,
      kind: input.kind,
      title,
      body,
      contains_spoilers: Boolean(input.spoiler),
    }).select('*').single();
    if (error) throw error;
    return data;
  },

  async update(topicId: string, values: { title?: string; body?: string; spoiler?: boolean }) {
    const userId = await requireUserId();
    const payload: Record<string, string | boolean> = {};
    if (values.title !== undefined) payload.title = sanitizePlainText(values.title, 160);
    if (values.body !== undefined) payload.body = sanitizePlainText(values.body, 6000);
    if (values.spoiler !== undefined) payload.contains_spoilers = values.spoiler;
    const { error } = await getSupabase().from('forum_topics').update(payload).eq('id', topicId).eq('author_id', userId);
    if (error) throw error;
  },

  async remove(topicId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('forum_topics').update({ deleted_at: new Date().toISOString() }).eq('id', topicId).eq('author_id', userId);
    if (error) throw error;
  },

  async listReplies(topicId: string) {
    const { data, error } = await getSupabase().rpc('list_forum_replies', { selected_topic_id: topicId });
    if (error) throw error;
    return data ?? [];
  },

  async reply(topicId: string, bodyValue: string, spoiler = false) {
    const userId = await requireUserId();
    const body = sanitizePlainText(bodyValue, 6000);
    if (body.length < 2) throw new Error('La respuesta está vacía.');
    const { data, error } = await getSupabase().from('forum_replies').insert({ topic_id: topicId, author_id: userId, body, contains_spoilers: spoiler }).select('*').single();
    if (error) throw error;
    return data;
  },

  async updateReply(replyId: string, bodyValue: string, spoiler: boolean) {
    const userId = await requireUserId();
    const body = sanitizePlainText(bodyValue, 6000);
    if (body.length < 2) throw new Error('La respuesta está vacía.');
    const { error } = await getSupabase().from('forum_replies').update({ body, contains_spoilers: spoiler }).eq('id', replyId).eq('author_id', userId);
    if (error) throw error;
  },

  async removeReply(replyId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('forum_replies').update({ deleted_at: new Date().toISOString() }).eq('id', replyId).eq('author_id', userId);
    if (error) throw error;
  },

  async setLike(topicId: string, liked: boolean) {
    const userId = await requireUserId();
    const query = getSupabase().from('forum_likes');
    const { error } = liked
      ? await query.upsert({ topic_id: topicId, user_id: userId }, { onConflict: 'topic_id,user_id', ignoreDuplicates: true })
      : await query.delete().eq('topic_id', topicId).eq('user_id', userId);
    if (error) throw error;
  },

  async acceptReply(topicId: string, replyId: string) {
    const { error } = await getSupabase().rpc('accept_forum_reply', { selected_topic_id: topicId, selected_reply_id: replyId });
    if (error) throw error;
  },

  async report(targetType: 'topic' | 'reply', targetId: string, reasonValue: string) {
    const userId = await requireUserId();
    const reason = sanitizePlainText(reasonValue, 500);
    const { error } = await getSupabase().from('content_reports').insert({ reporter_id: userId, target_type: targetType, target_id: targetId, reason });
    if (error) throw error;
  },

  subscribe(onChange: () => void) {
    const channel = getSupabase().channel('forums:changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_topics' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_likes' }, onChange)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },

  subscribeReplies(topicId: string, onChange: () => void) {
    const channel = getSupabase().channel(`forum-replies:${topicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies', filter: `topic_id=eq.${topicId}` }, onChange)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
