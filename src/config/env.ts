const clean = (value: string | undefined) => value?.trim() ?? '';

function decodeJwtRole(value: string) {
  const payload = value.split('.')[1];
  if (!payload) return '';
  try {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bits = 0;
    let accumulator = 0;
    let decoded = '';
    for (const character of payload.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
      const index = alphabet.indexOf(character);
      if (index < 0) return '';
      accumulator = (accumulator << 6) | index;
      bits += 6;
      if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((accumulator >> bits) & 255); }
    }
    return String(JSON.parse(decoded).role ?? '').toLowerCase();
  } catch {
    return '';
  }
}

export function isUnsafeSupabaseKey(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('sb_secret_')
    || normalized.includes('service_role')
    || decodeJwtRole(value) === 'service_role';
}

export function isPublicSupabaseKey(value: string) {
  return !isUnsafeSupabaseKey(value)
    && (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value) || decodeJwtRole(value) === 'anon');
}

export const env = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    || clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL),
  webUrl: clean(process.env.EXPO_PUBLIC_WEB_URL) || 'https://dominio-produccion.com',
  turnstileSiteKey: clean(process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY),
  demoMode: clean(process.env.EXPO_PUBLIC_DEMO_MODE).toLowerCase() === 'true',
} as const;

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl.startsWith('https://')
  && isPublicSupabaseKey(env.supabasePublishableKey),
);

export function requireSupabaseConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error('PYSUP aún no tiene configuradas EXPO_PUBLIC_SUPABASE_URL y una clave pública de Supabase.');
  }
}
