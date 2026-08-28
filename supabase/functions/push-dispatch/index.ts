import { adminClient, json } from '../_shared/client.ts';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) return json({ error: 'unauthorized' }, 401);
  try {
    const payload = await request.json() as { record?: { id?: string } };
    const notificationId = payload.record?.id;
    if (!notificationId) return json({ error: 'notification_id_required' }, 400);
    const admin = adminClient();
    const { data: notification, error } = await admin.from('notifications').select('*').eq('id', notificationId).single();
    if (error || !notification) return json({ error: 'notification_not_found' }, 404);
    const { data: preferences } = await admin.from('user_preferences').select('push_notifications').eq('user_id', notification.user_id).maybeSingle();
    if (preferences?.push_notifications === false) return json({ skipped: 'preference_disabled' });
    const { data: tokens, error: tokenError } = await admin.from('push_tokens').select('token').eq('user_id', notification.user_id).eq('active', true);
    if (tokenError) throw tokenError;
    if (!tokens?.length) return json({ skipped: 'no_tokens' });
    const messages = tokens.map((row: { token: string }) => ({
      to: row.token,
      title: notification.title,
      body: notification.body,
      data: { notificationId: notification.id, destination: notification.destination },
      sound: 'default',
    }));
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
      body: JSON.stringify(messages),
    });
    if (!response.ok) throw new Error(`expo_push_${response.status}`);
    return json({ sent: messages.length, receipts: await response.json() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'push_failed' }, 500);
  }
});
