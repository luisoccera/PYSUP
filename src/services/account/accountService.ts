import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getSupabase } from '../supabase/client';

async function invoke(functionName: string) {
  const { data, error } = await getSupabase().functions.invoke(functionName);
  if (error) throw error;
  return data;
}

export const accountService = {
  async requestDataExport() {
    const data = await invoke('export-user-data');
    const serialized = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pysup-datos-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const path = `${FileSystem.cacheDirectory}pysup-datos-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(path, serialized);
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Guardar mis datos de PYSUP' });
  },
  deleteAccount: () => invoke('delete-account'),
};
