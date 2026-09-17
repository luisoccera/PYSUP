import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AuthChangeEvent, Session as SupabaseSession } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../../config/env';
import { sanitizePlainText, validateCurrentPassword, validateEmail, validatePassword } from '../../utils/validation';
import { toAppError } from '../../utils/errors';
import { getSupabase } from '../supabase/client';
import { authThrottle } from './authThrottle';
import { captchaService } from './captchaService';

WebBrowser.maybeCompleteAuthSession();

const REMEMBER_KEY = 'pysup:remember-session:v2';
const LEGACY_SESSION_KEY = 'pysup:demo-session:v1';

function redirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new URL('/auth/callback', window.location.origin).toString();
  }
  return Linking.createURL('auth/callback', { scheme: 'pysup' });
}

async function saveRememberPreference(remember: boolean) {
  await AsyncStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

export const authService = {
  async migrateLegacySession() {
    const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy && !env.demoMode) await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
    if (Platform.OS === 'web' || !isSupabaseConfigured) return;
    const storageKey = `sb-${new URL(env.supabaseUrl).hostname.split('.')[0]}-auth-token`;
    const oldSession = await AsyncStorage.getItem(storageKey);
    if (!oldSession) return;
    try {
      const parsed = JSON.parse(oldSession) as { access_token?: string; refresh_token?: string };
      if (typeof parsed.access_token !== 'string' || typeof parsed.refresh_token !== 'string') return;
      // Nunca convierte un estado local/demo en una identidad autenticada.
      const verified = await getSupabase().auth.getUser(parsed.access_token);
      if (verified.error || !verified.data.user) return;
      const migrated = await getSupabase().auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token });
      if (migrated.error) throw toAppError(migrated.error);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    } finally {
      await AsyncStorage.removeItem(storageKey);
    }
  },

  async enforceRememberPreference() {
    const remember = await AsyncStorage.getItem(REMEMBER_KEY);
    if (remember === 'false') {
      await getSupabase().auth.signOut({ scope: 'local' });
      await AsyncStorage.setItem(REMEMBER_KEY, 'true');
    }
  },

  async getSession() {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw toAppError(error);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: SupabaseSession | null) => void) {
    return getSupabase().auth.onAuthStateChange(callback).data.subscription;
  },

  async signIn(emailValue: string, passwordValue: string, remember: boolean, captchaToken?: string) {
    const email = validateEmail(emailValue);
    const password = validateCurrentPassword(passwordValue);
    await authThrottle.assertAllowed();
    const verifiedCaptcha = await captchaService.getToken(captchaToken);
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
      options: verifiedCaptcha ? { captchaToken: verifiedCaptcha } : undefined,
    });
    if (error) {
      await authThrottle.recordFailure();
      throw toAppError(error, 'No fue posible iniciar sesión.');
    }
    await authThrottle.clear();
    await saveRememberPreference(remember);
    return data.session;
  },

  async signUp(nameValue: string, emailValue: string, passwordValue: string, captchaToken?: string) {
    const displayName = sanitizePlainText(nameValue, 60);
    if (displayName.length < 2) throw new Error('Escribe el nombre que verán tus amigos.');
    const email = validateEmail(emailValue);
    const password = validatePassword(passwordValue);
    const verifiedCaptcha = await captchaService.getToken(captchaToken);
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: { display_name: displayName },
        ...(verifiedCaptcha ? { captchaToken: verifiedCaptcha } : {}),
      },
    });
    if (error) throw toAppError(error, 'No fue posible crear la cuenta.');
    await saveRememberPreference(true);
    return { session: data.session, requiresEmailConfirmation: !data.session };
  },

  async signInWithProvider(provider: 'google' | 'apple') {
    const callback = redirectUrl();
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    if (error) throw toAppError(error, `No fue posible continuar con ${provider}.`);
    if (Platform.OS === 'web' || !data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, callback);
    if (result.type !== 'success') {
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      throw new Error('No se completó la autorización.');
    }
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('El proveedor no devolvió un código de autorización válido.');
    const exchange = await getSupabase().auth.exchangeCodeForSession(code);
    if (exchange.error) throw toAppError(exchange.error);
  },

  async sendPasswordRecovery(emailValue: string, captchaToken?: string) {
    const email = validateEmail(emailValue);
    const verifiedCaptcha = await captchaService.getToken(captchaToken);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl(),
      ...(verifiedCaptcha ? { captchaToken: verifiedCaptcha } : {}),
    });
    if (error) throw toAppError(error, 'No pudimos enviar el correo de recuperación.');
  },

  async requestPasswordCode() {
    const { error } = await getSupabase().auth.reauthenticate();
    if (error) throw toAppError(error);
  },

  async updatePassword(passwordValue: string, currentPasswordValue?: string, nonce?: string) {
    const password = validatePassword(passwordValue);
    const currentPassword = currentPasswordValue ? validateCurrentPassword(currentPasswordValue) : undefined;
    const { error } = await getSupabase().auth.updateUser({
      password,
      ...(currentPassword ? { current_password: currentPassword } : {}),
      ...(nonce ? { nonce: nonce.trim() } : {}),
    });
    if (error) throw toAppError(error);
  },

  async signOut(allDevices = false) {
    const { error } = await getSupabase().auth.signOut({ scope: allDevices ? 'global' : 'local' });
    if (error) throw toAppError(error);
  },
};
