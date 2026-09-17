import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '../../utils/errors';

const STORAGE_KEY = 'pysup:auth-throttle:v1';
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type AttemptState = { failures: number; windowStartedAt: number; lockedUntil: number };

async function readState(): Promise<AttemptState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return { failures: 0, windowStartedAt: Date.now(), lockedUntil: 0 };
    const parsed = JSON.parse(stored) as Partial<AttemptState>;
    return {
      failures: Number(parsed.failures) || 0,
      windowStartedAt: Number(parsed.windowStartedAt) || Date.now(),
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, windowStartedAt: Date.now(), lockedUntil: 0 };
  }
}

export const authThrottle = {
  async assertAllowed() {
    const state = await readState();
    const remaining = state.lockedUntil - Date.now();
    if (remaining > 0) {
      const minutes = Math.max(1, Math.ceil(remaining / 60_000));
      throw new AppError(`Demasiados intentos. Intenta de nuevo en ${minutes} min.`, 'auth_rate_limited');
    }
  },

  async recordFailure() {
    const now = Date.now();
    const previous = await readState();
    const expiredWindow = now - previous.windowStartedAt > WINDOW_MS;
    const failures = expiredWindow ? 1 : previous.failures + 1;
    const next: AttemptState = {
      failures,
      windowStartedAt: expiredWindow ? now : previous.windowStartedAt,
      lockedUntil: failures >= MAX_FAILURES ? now + LOCK_MS : 0,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
