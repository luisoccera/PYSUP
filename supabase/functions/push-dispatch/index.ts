import { adminClient, internalError, json, readJsonBody, verifySharedSecret } from '../_shared/client.ts';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  if (!await verifySharedSecret(request, 'x-webhook-secret', 'PUSH_WEBHOOK_SECRET')) return json(request, { error: 'unauthorized' }, 401);
  try {
    const payload = await readJsonBody<{ record?: { id?: string } }>(request, 8_192);
    const notificationId = payload.record?.id;
    if (!notificationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) return json(request, { error: 'notification_id_required' }, 400);
    const admin = adminClient();
    const { data: notification, error } = await admin.from('notifications').select('*').eq('id', notificationId).single();
    if (error || !notification) return json(request, { error: 'notification_not_found' }, 404);
    const { data: preferences } = await admin.from('user_preferences').select('push_notifications').eq('user_id', notification.user_id).maybeSingle();
    if (preferences?.push_notifications === false) return json(request, { skipped: 'preference_disabled' });
    const { data: tokens, error: tokenError } = await admin.from('push_tokens').select('token').eq('user_id', notification.user_id).eq('active', true).limit(100);
    if (tokenError) throw tokenError;
    if (!tokens?.length) return json(request, { skipped: 'no_tokens' });
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
    return json(request, { sent: messages.length, receipts: await response.json() });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'request_too_large') return json(request, { error: code }, 413);
    if (['invalid_json', 'invalid_content_type'].includes(code)) return json(request, { error: code }, 400);
    return internalError(request, 'push_failed', error);
  }
});
