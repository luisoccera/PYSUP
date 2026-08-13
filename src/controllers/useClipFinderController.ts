import { useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { catalogue } from '../models/catalogue';
import { ClipAnalysisState, ClipSourceKind } from '../models/types';

const allowedHosts = [
  'tiktok.com',
  'vm.tiktok.com',
  'x.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
];

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function formatVideoSize(bytes?: number) {
  if (!bytes) return 'Tamaño desconocido';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSupportedClipUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return parsed.protocol === 'https:' && (
      allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
      || /\.(mp4|mov|webm)$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function useClipFinderController() {
  const [source, setSource] = useState<ClipSourceKind>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [analysisState, setAnalysisState] = useState<ClipAnalysisState>('idle');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);

  const progress = useMemo(() => ({
    idle: 0,
    extracting: 24,
    matching: 58,
    catalogue: 82,
    complete: 100,
  })[analysisState], [analysisState]);

  const statusLabel = {
    idle: 'Listo para analizar',
    extracting: 'Extrayendo fotogramas y audio…',
    matching: 'Comparando escenas, diálogo y rostros…',
    catalogue: 'Comprobando el catálogo de México…',
    complete: 'Coincidencia encontrada',
  }[analysisState];

  const canAnalyze = consent
    && analysisState === 'idle'
    && (source === 'link' ? isSupportedClipUrl(url) : !!file);
  const urlSupported = !url || isSupportedClipUrl(url);
  const fileDescription = file
    ? `${formatVideoSize(file.size)} · ${file.mimeType || 'Video'}`
    : 'MP4, MOV o WebM · Máximo 100 MB · Ideal: 5–60 segundos';

  const selectSource = (nextSource: ClipSourceKind) => {
    setSource(nextSource);
    setAnalysisState('idle');
    setError('');
  };

  const changeUrl = (value: string) => {
    setUrl(value);
    setError('');
    setAnalysisState('idle');
  };

  const pickVideo = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      multiple: false,
      copyToCacheDirectory: true,
      base64: false,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (asset.size && asset.size > 100 * 1024 * 1024) {
      setFile(null);
      setError('El fragmento supera 100 MB. Recórtalo a 60 segundos o menos.');
      return;
    }
    setFile(asset);
  };

  const analyze = async () => {
    setError('');
    if (source === 'link' && !isSupportedClipUrl(url)) {
      setError('Usa un enlace público HTTPS de TikTok, X, Instagram, YouTube o un video directo.');
      return;
    }
    if (source === 'file' && !file) {
      setError('Selecciona primero un fragmento de video.');
      return;
    }
    if (!consent) {
      setError('Confirma que puedes usar este contenido para realizar la búsqueda.');
      return;
    }

    setAnalysisState('extracting');
    await wait(700);
    setAnalysisState('matching');
    await wait(900);
    setAnalysisState('catalogue');
    await wait(750);
    setAnalysisState('complete');
  };

  const reset = () => {
    setAnalysisState('idle');
    setUrl('');
    setFile(null);
    setError('');
    setConsent(false);
  };

  return {
    source,
    selectSource,
    url,
    changeUrl,
    file,
    analysisState,
    error,
    consent,
    toggleConsent: () => setConsent((current) => !current),
    canAnalyze,
    urlSupported,
    fileDescription,
    progress,
    statusLabel,
    result: catalogue[2],
    pickVideo,
    analyze,
    reset,
  };
}

export type ClipFinderController = ReturnType<typeof useClipFinderController>;
