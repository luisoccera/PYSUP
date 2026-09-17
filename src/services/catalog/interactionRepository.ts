import type { CommunityReview, Review } from '../../models/types';
import { sanitizePlainText } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

export type InteractionType = 'pass' | 'like' | 'save' | 'watch' | 'rate' | 'review';

export const interactionRepository = {
  async record(contentId: string, interactionType: InteractionType, value?: number, metadata: Record<string, unknown> = {}) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('user_interactions').insert({
      user_id: userId,
      content_id: contentId,
      interaction_type: interactionType,
      numeric_value: value ?? null,
      metadata,
    });
    if (error) throw error;
  },

  async listIds(type: InteractionType) {
    const userId = await requireUserId();
    if (type === 'like' || type === 'save') {
      const table = type === 'like' ? 'favorites' : 'saved_items';
      const { data, error } = await getSupabase().from(table).select('content_id').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => row.content_id as string);
    }
    const { data, error } = await getSupabase().from('user_interactions').select('content_id,metadata,occurred_at').eq('user_id', userId).eq('interaction_type', type).is('deleted_at', null).order('occurred_at', { ascending: false });
    if (error) throw error;
    const latest = new Map<string, boolean>();
    for (const row of data ?? []) {
      const contentId = row.content_id as string;
      if (!latest.has(contentId)) latest.set(contentId, (row.metadata as { active?: boolean } | null)?.active !== false);
    }
    return [...latest.entries()].filter(([, active]) => active).map(([contentId]) => contentId);
  },

  async setFlag(contentId: string, type: 'like' | 'save', active: boolean) {
    await interactionRepository.record(contentId, type, undefined, { active });
  },

  async upsertReview(contentId: string, rating: number, text: string, spoiler: boolean) {
    const safeRating = Math.round(rating);
    if (safeRating < 1 || safeRating > 5) throw new Error('La calificación debe estar entre 1 y 5.');
    const body = sanitizePlainText(text, 4000);
    if (body.length < 3) throw new Error('La reseña es demasiado corta.');
    const { data, error } = await getSupabase().rpc('upsert_my_review', {
      selected_content_id: contentId,
      selected_rating: safeRating,
      selected_body: body,
      selected_spoiler: spoiler,
    });
    if (error) throw error;
    await interactionRepository.record(contentId, 'review', safeRating);
    return data;
  },

  async deleteReview(reviewId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('reviews').update({ deleted_at: new Date().toISOString() }).eq('id', reviewId).eq('user_id', userId);
    if (error) throw error;
  },

  async listMyReviews(): Promise<Review[]> {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('reviews').select('id,content_id,rating,body,contains_spoilers,created_at,review_likes(count)').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      contentId: row.content_id as string,
      rating: row.rating as number,
      text: row.body as string,
      date: row.created_at as string,
      likes: Array.isArray(row.review_likes) ? Number(row.review_likes[0]?.count ?? 0) : 0,
      containsSpoilers: Boolean(row.contains_spoilers),
    }));
  },

  async listContentReviews(contentId: string) {
    const { data, error } = await getSupabase().rpc('list_content_reviews', { selected_content_id: contentId });
    if (error) throw error;
    return (data ?? []) as CommunityReview[];
  },

  async setReviewLike(reviewId: string, liked: boolean) {
    const userId = await requireUserId();
    const query = getSupabase().from('review_likes');
    const { error } = liked
      ? await query.upsert({ review_id: reviewId, user_id: userId }, { onConflict: 'review_id,user_id', ignoreDuplicates: true })
      : await query.delete().eq('review_id', reviewId).eq('user_id', userId);
    if (error) throw error;
  },

  subscribe(userId: string, onChange: () => void) {
    const channel = getSupabase().channel(`interactions:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_interactions', filter: `user_id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
