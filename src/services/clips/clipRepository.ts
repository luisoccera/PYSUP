import { MAX_CLIP_BYTES, MAX_CLIP_SECONDS, validateHttpsUrl } from '../../utils/validation';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase, requireUserId } from '../supabase/client';

const ALLOWED_HOSTS = ['tiktok.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com', 'youtu.be'];
const ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const BUCKET = 'clip-uploads';

export type ClipAsset = {
  uri: string;
  mimeType: string;
  size: number;
  durationSeconds?: number;
  name?: string;
};

export type ClipJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'no_match';

export const clipRepository = {
  validateLink(value: string) {
    return validateHttpsUrl(value, ALLOWED_HOSTS);
  },

  validateAsset(asset: ClipAsset) {
    if (!ALLOWED_MIME.has(asset.mimeType)) throw new Error('Usa un video MP4, MOV o WebM.');
    if (asset.size <= 0 || asset.size > MAX_CLIP_BYTES) throw new Error('El video debe pesar menos de 80 MB.');
    if (asset.durationSeconds !== undefined && asset.durationSeconds > MAX_CLIP_SECONDS) throw new Error('El fragmento no puede durar más de 90 segundos.');
  },

  async createFromLink(value: string, consent: boolean) {
    if (!consent) throw new Error('Necesitamos tu consentimiento para analizar el fragmento.');
    const userId = await requireUserId();
    const sourceUrl = clipRepository.validateLink(value);
    const { data, error } = await getSupabase().from('clip_analysis_jobs').insert({ user_id: userId, source_type: 'link', source_url: sourceUrl, consent_at: new Date().toISOString() }).select('*').single();
    if (error) throw error;
    return data;
  },

  async createFromFile(asset: ClipAsset, consent: boolean) {
    if (!consent) throw new Error('Necesitamos tu consentimiento para analizar el fragmento.');
    clipRepository.validateAsset(asset);
    const userId = await requireUserId();
    const extension = asset.mimeType === 'video/quicktime' ? 'mov' : asset.mimeType === 'video/webm' ? 'webm' : 'mp4';
    const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storage = getSupabase().storage.from(BUCKET);
    const ticket = await storage.createSignedUploadUrl(storagePath);
    if (ticket.error) throw ticket.error;
    let uploadedBytes = asset.size;
    if (Platform.OS === 'web') {
      const fileBytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
      uploadedBytes = fileBytes.byteLength;
      if (uploadedBytes > MAX_CLIP_BYTES) throw new Error('El video supera el límite de 80 MB.');
      const upload = await storage.uploadToSignedUrl(storagePath, ticket.data.token, fileBytes, { contentType: asset.mimeType });
      if (upload.error) throw upload.error;
    } else {
      const upload = await FileSystem.uploadAsync(ticket.data.signedUrl, asset.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': asset.mimeType, 'x-upsert': 'false' },
      });
      if (upload.status < 200 || upload.status >= 300) throw new Error('No se pudo subir el fragmento mediante la URL temporal.');
    }

    const { data, error } = await getSupabase().from('clip_analysis_jobs').insert({
      user_id: userId,
      source_type: 'upload',
      storage_path: storagePath,
      source_mime: asset.mimeType,
      source_size_bytes: uploadedBytes,
      source_duration_seconds: asset.durationSeconds ?? null,
      consent_at: new Date().toISOString(),
    }).select('*').single();
    if (error) {
      await storage.remove([storagePath]);
      throw error;
    }
    return data;
  },

  async enqueue(jobId: string) {
    const { error } = await getSupabase().functions.invoke('clip-analysis', { body: { jobId } });
    if (error) throw error;
  },

  async getJob(jobId: string) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('clip_analysis_jobs').select('*,clip_candidates(*,content_items(*))').eq('id', jobId).eq('user_id', userId).single();
    if (error) throw error;
    return data;
  },

  async confirmCandidate(jobId: string, candidateId: string | null) {
    const { error } = await getSupabase().rpc('confirm_clip_candidate', { selected_job_id: jobId, selected_candidate_id: candidateId });
    if (error) throw error;
  },

  async retry(jobId: string) {
    const { error } = await getSupabase().rpc('retry_clip_analysis', { selected_job_id: jobId });
    if (error) throw error;
    await clipRepository.enqueue(jobId);
  },

  subscribe(jobId: string, onChange: (job: Record<string, unknown>) => void) {
    const channel = getSupabase().channel(`clip:${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clip_analysis_jobs', filter: `id=eq.${jobId}` }, (payload) => onChange(payload.new))
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
