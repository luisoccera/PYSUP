import { adminClient, internalError, json, verifySharedSecret } from '../_shared/client.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  if (!await verifySharedSecret(request, 'x-cron-secret', 'CRON_SECRET')) return json(request, { error: 'unauthorized' }, 401);
  try {
  const admin = adminClient();
  const { data: jobs, error } = await admin.from('clip_analysis_jobs').select('id,storage_path').lt('purge_after', new Date().toISOString()).not('storage_path', 'is', null).is('deleted_at', null).limit(500);
  if (error) return internalError(request, 'purge_query_failed', error);
  const { data: expiredObjects, error: orphanError } = await admin.rpc('list_expired_clip_objects');
  if (orphanError) throw orphanError;
  const paths = [...new Set([
    ...(jobs ?? []).flatMap((job) => job.storage_path ? [job.storage_path as string] : []),
    ...(expiredObjects ?? []).map((object: { name: string }) => object.name),
  ])];
  if (paths.length) {
    const { error: removalError } = await admin.storage.from('clip-uploads').remove(paths);
    if (removalError) throw removalError;
  }
  if (jobs?.length) {
    const { error: updateError } = await admin.from('clip_analysis_jobs').update({ storage_path: null, deleted_at: new Date().toISOString() }).in('id', jobs.map((job) => job.id));
    if (updateError) throw updateError;
  }
  return json(request, { purged: paths.length });
  } catch (error) {
    return internalError(request, 'purge_failed', error);
  }
});
