import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import type { ContentAvailability, ContentItem, ClipAnalysisState, ClipSourceKind } from '../models/types';
import { catalogRepository, mapContent } from '../services/catalog/catalogRepository';
import { clipRepository, ClipAsset } from '../services/clips/clipRepository';
import type { ContentRecord } from '../services/supabase/records';
import { toAppError } from '../utils/errors';

const allowedHosts = ['tiktok.com', 'x.com', 'twitter.com', 'instagram.com', 'youtube.com', 'youtu.be'];

export type ClipCandidate = {
  id: string;
  title: string;
  confidence: number;
  evidence: Record<string, unknown>;
  content: ContentItem | null;
};

function formatVideoSize(bytes?: number) {
  if (!bytes) return 'Tamaño pendiente de validación';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSupportedClipUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return parsed.protocol === 'https:' && allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function useClipFinderController(country: string, wifiOnly: boolean) {
  const [source, setSource] = useState<ClipSourceKind>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<(ClipAsset & { name: string }) | null>(null);
  const [analysisState, setAnalysisState] = useState<ClipAnalysisState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [serverProgress, setServerProgress] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<ClipCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ContentAvailability | null>(null);

  const result = candidates.find((candidate) => candidate.id === selectedCandidateId)?.content ?? candidates[0]?.content ?? null;
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null;
  const progress = analysisState === 'uploading' ? 12 : analysisState === 'pending' ? 25 : analysisState === 'processing' ? Math.max(35, serverProgress) : analysisState === 'complete' || analysisState === 'no_match' ? 100 : 0;
  const statusLabel = {
    idle: 'Listo para analizar', uploading: 'Subiendo mediante URL firmada…', pending: 'Análisis en cola…',
    processing: 'Analizando fotogramas, audio, OCR y transcripción…', complete: 'Candidatos encontrados',
    no_match: 'No encontramos coincidencias', failed: 'El análisis no pudo completarse',
  }[analysisState];

  const canAnalyze = consent && analysisState === 'idle' && (source === 'link' ? isSupportedClipUrl(url) : Boolean(file));
  const urlSupported = !url || isSupportedClipUrl(url);
  const fileDescription = file
    ? `${formatVideoSize(file.size)} · ${file.mimeType}${file.durationSeconds ? ` · ${Math.round(file.durationSeconds)} s` : ''}`
    : 'MP4, MOV o WebM · Máximo 80 MB y 90 segundos';

  const loadJob = useCallback(async (id: string) => {
    const job = await clipRepository.getJob(id);
    setServerProgress(Number(job.progress ?? 0));
    if (job.status === 'failed') {
      setAnalysisState('failed');
      setError(String(job.error_message ?? 'El análisis no pudo completarse.'));
      return;
    }
    if (job.status === 'no_match') {
      setAnalysisState('no_match'); setCandidates([]); return;
    }
    if (job.status === 'pending') { setAnalysisState('pending'); return; }
    if (job.status === 'processing') { setAnalysisState('processing'); return; }
    if (job.status !== 'completed') return;
    const mapped = ((job.clip_candidates ?? []) as Record<string, unknown>[])
      .sort((a, b) => Number(a.rank) - Number(b.rank))
      .map((candidate): ClipCandidate => ({
        id: String(candidate.id),
        title: String(candidate.candidate_title),
        confidence: Number(candidate.confidence),
        evidence: (candidate.evidence ?? {}) as Record<string, unknown>,
        content: candidate.content_items ? mapContent(candidate.content_items as ContentRecord) : null,
      }));
    setCandidates(mapped);
    setSelectedCandidateId(mapped[0]?.id ?? null);
    setAnalysisState(mapped.length ? 'complete' : 'no_match');
  }, []);

  useEffect(() => {
    if (!jobId || ['complete', 'no_match', 'failed'].includes(analysisState)) return;
    const unsubscribe = clipRepository.subscribe(jobId, () => { void loadJob(jobId).catch((caught) => setError(toAppError(caught).message)); });
    const timer = setInterval(() => { void loadJob(jobId).catch((caught) => setError(toAppError(caught).message)); }, 4000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [analysisState, jobId, loadJob]);

  useEffect(() => {
    if (!selectedCandidate?.content) { setAvailability(null); return; }
    let active = true;
    void catalogRepository.getAvailability(selectedCandidate.content.id, country)
      .then((offers) => { if (active) setAvailability(offers); })
      .catch((caught) => { if (active) setError(toAppError(caught).message); });
    return () => { active = false; };
  }, [country, selectedCandidate]);

  const selectSource = (nextSource: ClipSourceKind) => { setSource(nextSource); setAnalysisState('idle'); setError(''); };
  const changeUrl = (value: string) => { setUrl(value); setError(''); setAnalysisState('idle'); };

  const pickVideo = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('Necesitamos permiso para seleccionar un fragmento.');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const selected: ClipAsset & { name: string } = {
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'video/mp4',
      size: asset.fileSize ?? 0,
      durationSeconds: asset.duration ? asset.duration / 1000 : undefined,
      name: asset.fileName ?? `fragmento-${Date.now()}.mp4`,
    };
    try { clipRepository.validateAsset(selected); setFile(selected); }
    catch (caught) { setFile(null); setError(toAppError(caught).message); }
  };

  const analyze = async () => {
    setError(''); setCandidates([]); setAvailability(null);
    try {
      if (source === 'file' && wifiOnly) {
        const network = await Network.getNetworkStateAsync();
        if (network.type !== Network.NetworkStateType.WIFI && network.type !== Network.NetworkStateType.ETHERNET) throw new Error('La subida está limitada a Wi-Fi desde Configuración.');
      }
      setAnalysisState(source === 'file' ? 'uploading' : 'pending');
      const job = source === 'link'
        ? await clipRepository.createFromLink(url, consent)
        : await clipRepository.createFromFile(file!, consent);
      const id = String(job.id);
      setJobId(id); setAnalysisState('pending');
      void clipRepository.enqueue(id).catch((caught) => { setAnalysisState('failed'); setError(toAppError(caught).message); });
    } catch (caught) {
      setAnalysisState('failed'); setError(toAppError(caught).message);
    }
  };

  const retry = () => {
    if (!jobId) return;
    setError(''); setAnalysisState('pending');
    void clipRepository.retry(jobId).catch((caught) => { setAnalysisState('failed'); setError(toAppError(caught).message); });
  };

  const confirm = (candidateId: string | null) => {
    if (!jobId) return Promise.resolve();
    return clipRepository.confirmCandidate(jobId, candidateId);
  };

  const reset = () => { setAnalysisState('idle'); setUrl(''); setFile(null); setError(''); setConsent(false); setJobId(null); setCandidates([]); setAvailability(null); };

  return { country, source, selectSource, url, changeUrl, file, analysisState, error, consent, toggleConsent: () => setConsent((current) => !current), canAnalyze, urlSupported, fileDescription, progress, statusLabel, result, selectedCandidate, candidates, selectedCandidateId, setSelectedCandidateId, availability, pickVideo, analyze, retry, confirm, reset };
}

export type ClipFinderController = ReturnType<typeof useClipFinderController>;
