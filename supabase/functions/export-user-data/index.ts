import { adminClient, authenticatedUser, consumeSecurityBudget, corsHeaders, handleCorsPreflight, internalError, json } from '../_shared/client.ts';
import { collectPages } from '../_shared/pagination.ts';

const MAX_EXPORT_BYTES = 10 * 1024 * 1024;
type Row = Record<string, unknown>;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  try {
    const user = await authenticatedUser(request);
    if (!await consumeSecurityBudget(user.id, 'data_export_requested', 3, 3600, request)) return json(request, { error: 'rate_limit' }, 429);
    const admin = adminClient();
    const exported: Record<string, unknown> = { exportedAt: new Date().toISOString(), userId: user.id };
    let bytes = 0;
    const encoder = new TextEncoder();
    async function readRows(table: string, column: string, value: string) {
      return collectPages<Row>((from, to) => admin.from(table).select('*').eq(column, value).order('created_at').range(from, to));
    }
    function add(table: string, rows: Row[]) {
      bytes += encoder.encode(JSON.stringify(rows)).byteLength;
      if (bytes > MAX_EXPORT_BYTES) throw new Error('export_too_large');
      exported[table] = rows;
      return rows;
    }
    async function relatedRows(table: string, column: string, ids: string[]) {
      const rows: Row[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100);
        const part = await collectPages<Row>((from, to) => admin.from(table).select('*').in(column, batch).order('created_at').range(from, to));
        rows.push(...part);
        if (rows.length > 50_000 || encoder.encode(JSON.stringify(rows)).byteLength > MAX_EXPORT_BYTES) throw new Error('export_too_large');
      }
      return rows;
    }
    add('profiles', await readRows('profiles', 'id', user.id));
    const ownTables = ['user_preferences', 'user_genres', 'provider_connections', 'user_interactions', 'favorites', 'saved_items', 'recommendations', 'reviews', 'review_likes', 'forum_likes', 'notifications', 'push_tokens', 'clip_analysis_jobs', 'room_participants'] as const;
    for (const table of ownTables) add(table, await readRows(table, 'user_id', user.id));
    for (const [table, column] of [['user_blocks', 'blocker_id'], ['forum_topics', 'author_id'], ['forum_replies', 'author_id'], ['content_reports', 'reporter_id']] as const) {
      add(table, await readRows(table, column, user.id));
    }
    for (const [table, low, high] of [['friend_requests', 'sender_id', 'receiver_id'], ['friendships', 'user_low_id', 'user_high_id'], ['direct_conversations', 'user_low_id', 'user_high_id'], ['room_invitations', 'inviter_id', 'invited_user_id']] as const) {
      add(table, await collectPages<Row>((from, to) => admin.from(table).select('*').or(`${low}.eq.${user.id},${high}.eq.${user.id}`).order('created_at').range(from, to)));
    }
    const ids = (table: string, column: string) => ((exported[table] ?? []) as Row[]).map((row) => String(row[column]));
    add('direct_messages', await relatedRows('direct_messages', 'conversation_id', ids('direct_conversations', 'id')));
    add('rooms', await relatedRows('rooms', 'id', ids('room_participants', 'room_id')));
    add('room_events', await relatedRows('room_events', 'room_id', ids('room_participants', 'room_id')));
    add('clip_candidates', await relatedRows('clip_candidates', 'job_id', ids('clip_analysis_jobs', 'id')));
    const serialized = JSON.stringify(exported);
    if (encoder.encode(serialized).byteLength > MAX_EXPORT_BYTES) throw new Error('export_too_large');
    return new Response(serialized, {
      headers: { ...corsHeaders(request), 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="pysup-data-${user.id}.json"` },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'export_too_large') return json(request, { error: code, message: 'La exportación supera 10 MB o 50.000 registros por tabla. Contacta al administrador para obtener una exportación completa; no se entregaron datos parciales.' }, 413);
    if (code === 'origin_not_allowed') return json(request, { error: code }, 403);
    if (code === 'authentication_required' || code === 'invalid_or_expired_session') return json(request, { error: 'authentication_required' }, 401);
    return internalError(request, 'export_failed', error);
  }
});
