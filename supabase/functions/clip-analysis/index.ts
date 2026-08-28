import { adminClient, authenticatedUser, corsHeaders, json } from '../_shared/client.ts';

type WorkerCandidate = {
  title: string;
  contentId?: string;
  confidence: number;
  evidence: Record<string, unknown>;
};

const allowedLinkHosts = ['tiktok.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com', 'youtu.be'];

function validPublicLink(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && allowedLinkHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function validCandidate(value: unknown): value is WorkerCandidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as WorkerCandidate;
  return typeof candidate.title === 'string'
    && candidate.title.trim().length > 0
    && typeof candidate.confidence === 'number'
    && candidate.confidence >= 0
    && candidate.confidence <= 1
    && candidate.evidence !== null
    && typeof candidate.evidence === 'object';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let jobId = '';
  const admin = adminClient();
  try {
    const user = await authenticatedUser(request);
    const body = await request.json() as { jobId?: string };
    jobId = body.jobId ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ error: 'invalid_job_id' }, 400);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from('security_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('event_type', 'clip_analysis_requested').gte('created_at', since);
    if ((count ?? 0) >= 10) return json({ error: 'rate_limit', message: 'Máximo 10 análisis por hora.' }, 429);

    const { data: job, error: jobError } = await admin.from('clip_analysis_jobs').select('*').eq('id', jobId).eq('user_id', user.id).single();
    if (jobError || !job) return json({ error: 'job_not_found' }, 404);
    if (!['pending', 'failed', 'no_match'].includes(job.status)) return json({ error: 'invalid_job_state' }, 409);
    if (job.source_type === 'link' && !validPublicLink(job.source_url ?? '')) return json({ error: 'unsupported_source_url' }, 400);
    if (job.source_type === 'upload' && (!['video/mp4', 'video/quicktime', 'video/webm'].includes(job.source_mime) || Number(job.source_size_bytes) > 83_886_080)) return json({ error: 'invalid_upload_metadata' }, 400);

    await admin.from('security_events').insert({ user_id: user.id, event_type: 'clip_analysis_requested', metadata: { job_id: jobId } });
    await admin.from('clip_analysis_jobs').update({ status: 'processing', progress: 5, processing_started_at: new Date().toISOString(), error_code: null, error_message: null }).eq('id', jobId);

    const workerUrl = Deno.env.get('CLIP_WORKER_URL');
    const workerToken = Deno.env.get('CLIP_WORKER_TOKEN');
    if (!workerUrl || !workerToken) throw new Error('clip_worker_not_configured');

    let signedSourceUrl: string | null = null;
    if (job.storage_path) {
      const signed = await admin.storage.from('clip-uploads').createSignedUrl(job.storage_path, 600);
      if (signed.error) throw signed.error;
      signedSourceUrl = signed.data.signedUrl;
    }

    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        sourceType: job.source_type,
        sourceUrl: job.source_url ?? signedSourceUrl,
        limits: { maxDurationSeconds: 90, modalities: ['frames', 'audio', 'ocr', 'transcription'] },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!workerResponse.ok) throw new Error(`worker_http_${workerResponse.status}`);
    const workerResult = await workerResponse.json() as { candidates?: unknown[]; durationSeconds?: number };
    if (typeof workerResult.durationSeconds === 'number' && workerResult.durationSeconds > 90) throw new Error('clip_duration_exceeded');
    const candidates = (workerResult.candidates ?? []).filter(validCandidate).slice(0, 10).sort((a, b) => b.confidence - a.confidence);

    await admin.from('clip_candidates').delete().eq('job_id', jobId);
    if (candidates.length) {
      const { error: candidateError } = await admin.from('clip_candidates').insert(candidates.map((candidate, index) => ({
        job_id: jobId,
        content_id: candidate.contentId ?? null,
        candidate_title: candidate.title.trim().slice(0, 300),
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        rank: index + 1,
      })));
      if (candidateError) throw candidateError;
    }
    await admin.from('clip_analysis_jobs').update({ status: candidates.length ? 'completed' : 'no_match', progress: 100, completed_at: new Date().toISOString() }).eq('id', jobId);
    if (job.storage_path) await admin.storage.from('clip-uploads').remove([job.storage_path]);
    return json({ jobId, status: candidates.length ? 'completed' : 'no_match', candidateCount: candidates.length });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 120) : 'unknown_error';
    if (jobId) await admin.from('clip_analysis_jobs').update({ status: 'failed', error_code: code, error_message: 'El análisis no pudo completarse. Puedes reintentarlo.', completed_at: new Date().toISOString() }).eq('id', jobId);
    return json({ error: code, recoverable: true }, code === 'clip_worker_not_configured' ? 503 : 500);
  }
});
