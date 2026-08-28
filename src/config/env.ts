const clean = (value: string | undefined) => value?.trim() ?? '';

export const env = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    || clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL),
  webUrl: clean(process.env.EXPO_PUBLIC_WEB_URL) || 'https://dominio-produccion.com',
  demoMode: clean(process.env.EXPO_PUBLIC_DEMO_MODE).toLowerCase() === 'true',
} as const;

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl.startsWith('https://')
  && env.supabasePublishableKey
  && !env.supabasePublishableKey.toLowerCase().includes('service_role'),
);

export function requireSupabaseConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error('PYSUP aún no tiene configuradas EXPO_PUBLIC_SUPABASE_URL y una clave pública de Supabase.');
  }
}
