import { adminClient, json } from '../_shared/client.ts';

Deno.serve(async (request) => {
  if (request.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const admin = adminClient();
  const { data: jobs, error } = await admin.from('clip_analysis_jobs').select('id,storage_path').lt('purge_after', new Date().toISOString()).not('storage_path', 'is', null).is('deleted_at', null).limit(500);
  if (error) return json({ error: error.message }, 500);
  const paths = (jobs ?? []).flatMap((job) => job.storage_path ? [job.storage_path as string] : []);
  if (paths.length) await admin.storage.from('clip-uploads').remove(paths);
  if (jobs?.length) await admin.from('clip_analysis_jobs').update({ storage_path: null, deleted_at: new Date().toISOString() }).in('id', jobs.map((job) => job.id));
  return json({ purged: paths.length });
});
