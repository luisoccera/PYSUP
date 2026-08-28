import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

function webStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

async function deleteNativeChunks(key: string) {
  const countText = await SecureStore.getItemAsync(`${key}:count`);
  const count = Number(countText ?? 0);
  await Promise.all([
    ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}:${index}`)),
    SecureStore.deleteItemAsync(`${key}:count`),
  ]);
}

export const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webStorage()?.getItem(key) ?? null;
    const count = Number(await SecureStore.getItemAsync(`${key}:count`) ?? 0);
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}:${index}`)),
    );
    return parts.some((part) => part === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(key, value);
      return;
    }
    await deleteNativeChunks(key);
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}:${index}`, chunk)));
    await SecureStore.setItemAsync(`${key}:count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      return;
    }
    await deleteNativeChunks(key);
  },
};
