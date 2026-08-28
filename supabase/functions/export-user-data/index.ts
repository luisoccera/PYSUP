import { adminClient, authenticatedUser, corsHeaders, json } from '../_shared/client.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await authenticatedUser(request);
    const admin = adminClient();
    const exported: Record<string, unknown> = { exportedAt: new Date().toISOString(), userId: user.id };

    const ownTables = ['user_preferences', 'user_genres', 'provider_connections', 'user_interactions', 'reviews', 'forum_likes', 'notifications', 'push_tokens', 'clip_analysis_jobs'] as const;
    const profile = await admin.from('profiles').select('*').eq('id', user.id);
    if (profile.error) throw profile.error;
    exported.profiles = profile.data;
    for (const table of ownTables) {
      const result = await admin.from(table).select('*').eq('user_id', user.id);
      if (result.error) throw result.error;
      exported[table] = result.data;
    }

    const requests = await admin.from('friend_requests').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    const friendships = await admin.from('friendships').select('*').or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`);
    const conversations = await admin.from('direct_conversations').select('*').or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`);
    if (requests.error || friendships.error || conversations.error) throw requests.error ?? friendships.error ?? conversations.error;
    exported.friend_requests = requests.data;
    exported.friendships = friendships.data;
    exported.direct_conversations = conversations.data;
    const conversationIds = (conversations.data ?? []).map((row: { id: string }) => row.id);
    const messages = conversationIds.length ? await admin.from('direct_messages').select('*').in('conversation_id', conversationIds) : { data: [], error: null };
    if (messages.error) throw messages.error;
    exported.direct_messages = messages.data;

    const participants = await admin.from('room_participants').select('*').eq('user_id', user.id);
    if (participants.error) throw participants.error;
    exported.room_participants = participants.data;
    const roomIds = (participants.data ?? []).map((row: { room_id: string }) => row.room_id);
    const rooms = roomIds.length ? await admin.from('rooms').select('*').in('id', roomIds) : { data: [], error: null };
    const roomEvents = roomIds.length ? await admin.from('room_events').select('*').in('room_id', roomIds) : { data: [], error: null };
    if (rooms.error || roomEvents.error) throw rooms.error ?? roomEvents.error;
    exported.rooms = rooms.data;
    exported.room_events = roomEvents.data;

    const topics = await admin.from('forum_topics').select('*').eq('author_id', user.id);
    const replies = await admin.from('forum_replies').select('*').eq('author_id', user.id);
    const reports = await admin.from('content_reports').select('*').eq('reporter_id', user.id);
    if (topics.error || replies.error || reports.error) throw topics.error ?? replies.error ?? reports.error;
    exported.forum_topics = topics.data;
    exported.forum_replies = replies.data;
    exported.content_reports = reports.data;

    const reviewIds = ((exported.reviews ?? []) as { id: string }[]).map((row) => row.id);
    const reviewLikes = reviewIds.length ? await admin.from('review_likes').select('*').in('review_id', reviewIds) : { data: [], error: null };
    const jobIds = ((exported.clip_analysis_jobs ?? []) as { id: string }[]).map((row) => row.id);
    const clipCandidates = jobIds.length ? await admin.from('clip_candidates').select('*').in('job_id', jobIds) : { data: [], error: null };
    if (reviewLikes.error || clipCandidates.error) throw reviewLikes.error ?? clipCandidates.error;
    exported.review_likes = reviewLikes.data;
    exported.clip_candidates = clipCandidates.data;

    return new Response(JSON.stringify(exported, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="pysup-data-${user.id}.json"` },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'export_failed' }, 400);
  }
});
