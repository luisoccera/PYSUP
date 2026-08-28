import type { ProviderId } from '../../models/types';

export type StreamingConnection = {
  providerId: ProviderId;
  connectionType: 'manual' | 'oauth' | 'import';
  status: 'selected' | 'connected';
  connectedAt: string | null;
  label: string;
};

export type StreamingProviderAdapter = {
  id: ProviderId;
  supportsOAuth: boolean;
  supportsHistoryImport: boolean;
  selectManually(): StreamingConnection;
};

function manualAdapter(id: ProviderId): StreamingProviderAdapter {
  return {
    id,
    supportsOAuth: false,
    supportsHistoryImport: false,
    selectManually: () => ({
      providerId: id,
      connectionType: 'manual',
      status: 'selected',
      connectedAt: null,
      label: 'Selección manual · sin acceso a tu cuenta ni historial',
    }),
  };
}

export const streamingProviderAdapters: Record<ProviderId, StreamingProviderAdapter> = {
  netflix: manualAdapter('netflix'),
  max: manualAdapter('max'),
  disney: manualAdapter('disney'),
  crunchyroll: manualAdapter('crunchyroll'),
  prime: manualAdapter('prime'),
};

export function getStreamingProviderAdapter(providerId: ProviderId) {
  return streamingProviderAdapters[providerId];
}
