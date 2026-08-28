import { AppError } from './errors';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_CLIP_BYTES = 80 * 1024 * 1024;
export const MAX_CLIP_SECONDS = 90;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizePlainText(value: string, maxLength: number) {
  return Array.from(value)
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .trim()
    .slice(0, maxLength);
}

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Ingresa un correo válido.', 'invalid_email');
  return email;
}

export function validatePassword(value: string) {
  if (value.length < 8) throw new AppError('La contraseña debe tener al menos 8 caracteres.', 'weak_password');
  if (value.length > 128) throw new AppError('La contraseña es demasiado larga.', 'weak_password');
  return value;
}

export function validateUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new AppError('El usuario debe tener de 3 a 24 letras, números o guiones bajos.', 'invalid_username');
  }
  return username;
}

export function validateHttpsUrl(value: string, allowedHosts?: string[]) {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new AppError('El enlace no es válido.', 'invalid_url');
  }
  if (parsed.protocol !== 'https:') throw new AppError('El enlace debe usar HTTPS.', 'invalid_url');
  if (allowedHosts && !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new AppError('Ese dominio todavía no es compatible.', 'unsupported_domain');
  }
  return parsed.toString();
}
