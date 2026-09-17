import { adminClient, authenticatedUser, consumeSecurityBudget, handleCorsPreflight, internalError, json } from '../_shared/client.ts';

async function removeUserFiles(admin: ReturnType<typeof adminClient>, bucket: string, userId: string) {
  const folders = [userId];
  let inspected = 0;
  while (folders.length) {
    const folder = folders.pop()!;
    const files: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      for (const item of data ?? []) {
        if (++inspected > 20_000) throw new Error('storage_cleanup_too_large');
        const path = `${folder}/${item.name}`;
        if (!path.startsWith(`${userId}/`) || item.name.includes('/') || item.name === '..') throw new Error('invalid_storage_path');
        if (item.id) files.push(path);
        else folders.push(path);
      }
      if ((data?.length ?? 0) < 100) break;
    }
    for (let offset = 0; offset < files.length; offset += 100) {
      const { error } = await admin.storage.from(bucket).remove(files.slice(offset, offset + 100));
      if (error) throw error;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  try {
    const user = await authenticatedUser(request);
    if (!await consumeSecurityBudget(user.id, 'account_deletion_requested', 3, 3600, request)) return json(request, { error: 'rate_limit' }, 429);
    const admin = adminClient();
    await removeUserFiles(admin, 'profile-media', user.id);
    await removeUserFiles(admin, 'clip-uploads', user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json(request, { deleted: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'origin_not_allowed') return json(request, { error: code }, 403);
    if (code === 'authentication_required' || code === 'invalid_or_expired_session') return json(request, { error: 'authentication_required' }, 401);
    return internalError(request, 'deletion_failed', error);
  }
});
