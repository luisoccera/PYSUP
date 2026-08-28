import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured, requireSupabaseConfiguration } from '../../config/env';
import { authStorage } from './storage';

let client: SupabaseClient | null = null;
let lifecycleBound = false;

export function getSupabase(): SupabaseClient {
  requireSupabaseConfiguration();
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  if (!lifecycleBound && Platform.OS !== 'web') {
    lifecycleBound = true;
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}
export { isSupabaseConfigured };

export async function requireUserId() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  return data.user.id;
}
