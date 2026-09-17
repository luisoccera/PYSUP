import { adminClient, authenticatedUser, consumeSecurityBudget, handleCorsPreflight, internalError, json, readJsonBody } from '../_shared/client.ts';
import { readLimitedText } from '../_shared/security.ts';

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
    return value.length <= 2048 && parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port
      && allowedLinkHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function validCandidate(value: unknown): value is WorkerCandidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as WorkerCandidate;
  return typeof candidate.title === 'string'
    && candidate.title.trim().length > 0
    && candidate.title.length <= 300
    && typeof candidate.confidence === 'number'
    && candidate.confidence >= 0
    && candidate.confidence <= 1
    && candidate.evidence !== null
    && typeof candidate.evidence === 'object'
    && JSON.stringify(candidate.evidence).length <= 16_384;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  let jobId = '';
  let ownedUserId = '';
  let processingClaimed = false;
  try {
    const user = await authenticatedUser(request);
    const admin = adminClient();
    const body = await readJsonBody<{ jobId?: string }>(request, 2_048);
    jobId = body.jobId ?? '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) return json(request, { error: 'invalid_job_id' }, 400);

    const { data: job, error: jobError } = await admin.from('clip_analysis_jobs').select('*').eq('id', jobId).eq('user_id', user.id).single();
    if (jobError || !job) return json(request, { error: 'job_not_found' }, 404);
    ownedUserId = user.id;
    if (!['pending', 'failed', 'no_match'].includes(job.status)) return json(request, { error: 'invalid_job_state' }, 409);
    if (job.source_type === 'link' && !validPublicLink(job.source_url ?? '')) return json(request, { error: 'unsupported_source_url' }, 400);
    if (job.source_type === 'upload') {
      if (!job.storage_path?.startsWith(`${user.id}/`) || !['video/mp4', 'video/quicktime', 'video/webm'].includes(job.source_mime)) return json(request, { error: 'invalid_upload_metadata' }, 400);
      const { data: file, error: fileError } = await admin.storage.from('clip-uploads').info(job.storage_path);
      if (fileError || !file || !file.size || file.size > 83_886_080 || !['video/mp4', 'video/quicktime', 'video/webm'].includes(file.contentType ?? '')) return json(request, { error: 'invalid_upload_file' }, 400);
    }
    if (!await consumeSecurityBudget(user.id, 'clip_analysis_requested', 10, 3600, request)) return json(request, { error: 'rate_limit' }, 429);
    const claim = await admin.from('clip_analysis_jobs').update({ status: 'processing', progress: 5, processing_started_at: new Date().toISOString(), error_code: null, error_message: null })
      .eq('id', jobId).eq('user_id', user.id).in('status', ['pending', 'failed', 'no_match']).select('id').maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) return json(request, { error: 'invalid_job_state' }, 409);
    processingClaimed = true;

    const workerUrl = Deno.env.get('CLIP_WORKER_URL');
    const workerToken = Deno.env.get('CLIP_WORKER_TOKEN');
    if (!workerUrl?.startsWith('https://') || !workerToken) throw new Error('clip_worker_not_configured');

    let signedSourceUrl: string | null = null;
    if (job.storage_path) {
      const signed = await admin.storage.from('clip-uploads').createSignedUrl(job.storage_path, 600);
      if (signed.error) throw signed.error;
      signedSourceUrl = signed.data.signedUrl;
    }

    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      redirect: 'error',
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
    const workerPayload = await readLimitedText(workerResponse, 1_048_576, 'worker_response_too_large');
    const workerResult = JSON.parse(workerPayload) as { candidates?: unknown[]; durationSeconds?: number };
    if (typeof workerResult.durationSeconds !== 'number' || !Number.isFinite(workerResult.durationSeconds) || workerResult.durationSeconds < 0 || workerResult.durationSeconds > 90) throw new Error('clip_duration_exceeded');
    const candidates = (Array.isArray(workerResult.candidates) ? workerResult.candidates : []).filter(validCandidate).slice(0, 10).sort((a, b) => b.confidence - a.confidence);

    const { error: clearError } = await admin.from('clip_candidates').delete().eq('job_id', jobId);
    if (clearError) throw clearError;
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
    if (job.storage_path) {
      const { error: removalError } = await admin.storage.from('clip-uploads').remove([job.storage_path]);
      if (removalError) throw removalError;
    }
    const { error: completionError } = await admin.from('clip_analysis_jobs').update({ status: candidates.length ? 'completed' : 'no_match', progress: 100, completed_at: new Date().toISOString() }).eq('id', jobId).eq('user_id', user.id).eq('status', 'processing');
    if (completionError) throw completionError;
    return json(request, { jobId, status: candidates.length ? 'completed' : 'no_match', candidateCount: candidates.length });
  } catch (error) {
    const internalCode = error instanceof Error ? error.message.slice(0, 120) : 'unknown_error';
    if (processingClaimed && ownedUserId) await adminClient().from('clip_analysis_jobs').update({ status: 'failed', error_code: 'clip_analysis_failed', error_message: 'El análisis no pudo completarse. Puedes reintentarlo.', completed_at: new Date().toISOString() }).eq('id', jobId).eq('user_id', ownedUserId).eq('status', 'processing');
    if (internalCode === 'origin_not_allowed') return json(request, { error: internalCode }, 403);
    if (internalCode === 'authentication_required' || internalCode === 'invalid_or_expired_session') return json(request, { error: 'authentication_required' }, 401);
    if (internalCode === 'request_too_large') return json(request, { error: internalCode }, 413);
    if (['invalid_json', 'invalid_content_type'].includes(internalCode)) return json(request, { error: internalCode }, 400);
    if (internalCode === 'clip_worker_not_configured') return internalError(request, internalCode, error, 503);
    console.error('clip_analysis_failed', error instanceof Error ? error.name : 'server_error');
    return json(request, { error: 'clip_analysis_failed', recoverable: true }, 500);
  }
});
