import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, platform } = vi.hoisted(() => ({ values: new Map<string, string>(), platform: { OS: 'ios' } }));
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => values.get(key) ?? null,
  deleteItemAsync: async (key: string) => { values.delete(key); },
  setItemAsync: async (key: string, value: string) => {
    if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error('invalid_native_key');
    values.set(key, value);
  },
}));
import { authStorage } from '../src/services/supabase/storage';

describe('sesión segura Android/iOS', () => {
  beforeEach(() => { values.clear(); platform.OS = 'ios'; });
  it('fragmenta y recupera sesiones usando claves válidas para SecureStore', async () => {
    const session = JSON.stringify({ token: 'x'.repeat(6000) });
    await authStorage.setItem('sb-project-auth-token', session);
    expect(await authStorage.getItem('sb-project-auth-token')).toBe(session);
    expect([...values.keys()].every((key) => !key.includes(':'))).toBe(true);
  });
  it('reemplaza una sesión eliminando fragmentos anteriores', async () => {
    await authStorage.setItem('session', 'x'.repeat(5000));
    await authStorage.setItem('session', 'nueva');
    expect(values.has('session.2')).toBe(false);
    expect(await authStorage.getItem('session')).toBe('nueva');
  });
  it('no acepta sesiones incompletas ni contadores manipulados', async () => {
    values.set('session.count', '2'); values.set('session.0', 'parcial');
    expect(await authStorage.getItem('session')).toBeNull();
    values.set('session.count', '1000000000');
    expect(await authStorage.getItem('session')).toBeNull();
    expect(values.has('session.count')).toBe(false);
  });
  it('cerrar sesión elimina todos los fragmentos', async () => {
    await authStorage.setItem('session', 'x'.repeat(4000));
    await authStorage.removeItem('session');
    expect(values.size).toBe(0);
  });
});
