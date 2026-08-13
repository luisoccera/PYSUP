import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from './types';

const SESSION_KEY = 'pysup:demo-session:v1';

export const sessionRepository = {
  async load(): Promise<Session | null> {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) as Session : null;
  },

  async save(session: Session): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};
