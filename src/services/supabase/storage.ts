import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 128;

function nativeKey(key: string, suffix: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error('Clave de almacenamiento de sesión inválida.');
  // SecureStore no permite ':' en sus claves.
  return `${key}.${suffix}`;
}

async function chunkCount(key: string) {
  const raw = await SecureStore.getItemAsync(nativeKey(key, 'count'));
  const count = Number(raw ?? 0);
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_CHUNKS) {
    await SecureStore.deleteItemAsync(nativeKey(key, 'count'));
    return 0;
  }
  return count;
}

function webStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

async function deleteNativeChunks(key: string) {
  const count = await chunkCount(key);
  await Promise.all([
    ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(nativeKey(key, String(index)))),
    SecureStore.deleteItemAsync(nativeKey(key, 'count')),
  ]);
}

export const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webStorage()?.getItem(key) ?? null;
    const count = await chunkCount(key);
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(nativeKey(key, String(index)))),
    );
    return parts.some((part) => part === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(key, value);
      return;
    }
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    if (chunks.length > MAX_CHUNKS) throw new Error('La sesión supera el tamaño máximo seguro.');
    await deleteNativeChunks(key);
    const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(nativeKey(key, String(index)), chunk, options)));
    await SecureStore.setItemAsync(nativeKey(key, 'count'), String(chunks.length), options);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      return;
    }
    await deleteNativeChunks(key);
  },
};
