import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { env } from '../../config/env';

export const captchaService = {
  async getToken(webToken?: string) {
    if (!env.turnstileSiteKey) return undefined;
    if (Platform.OS === 'web') {
      if (!webToken) throw new Error('Completa la verificación contra bots.');
      return webToken;
    }
    const base = new URL(env.webUrl);
    if (base.protocol !== 'https:' || base.hostname === 'dominio-produccion.com') {
      throw new Error('Configura el dominio HTTPS de PYSUP para la verificación móvil.');
    }
    const state = [...await Crypto.getRandomBytesAsync(32)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const challenge = new URL('/auth/captcha.html', base.origin);
    challenge.searchParams.set('siteKey', env.turnstileSiteKey);
    challenge.searchParams.set('state', state);
    const callback = 'pysup://captcha/callback';
    const result = await WebBrowser.openAuthSessionAsync(challenge.toString(), callback);
    if (result.type !== 'success') throw new Error('Se canceló la verificación contra bots.');
    const returned = new URL(result.url);
    const values = new URLSearchParams(returned.hash.slice(1));
    const token = values.get('token');
    if (returned.protocol !== 'pysup:' || returned.hostname !== 'captcha' || returned.pathname !== '/callback'
      || values.get('state') !== state || !token || token.length > 4096) {
      throw new Error('La verificación recibida no es válida. Intenta nuevamente.');
    }
    return token;
  },
};
