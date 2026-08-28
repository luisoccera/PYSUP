import { adminClient, authenticatedUser, corsHeaders, json } from '../_shared/client.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const user = await authenticatedUser(request);
    const admin = adminClient();
    const { data: media } = await admin.storage.from('profile-media').list(user.id);
    const { data: clips } = await admin.storage.from('clip-uploads').list(user.id);
    if (media?.length) await admin.storage.from('profile-media').remove(media.map((item) => `${user.id}/${item.name}`));
    if (clips?.length) await admin.storage.from('clip-uploads').remove(clips.map((item) => `${user.id}/${item.name}`));
    await admin.from('security_events').insert({ user_id: user.id, event_type: 'account_deletion_requested' });
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'deletion_failed' }, 400);
  }
});
