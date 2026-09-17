import { AppError } from './errors';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_CLIP_BYTES = 80 * 1024 * 1024;
export const MAX_CLIP_SECONDS = 90;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizePlainText(value: string, maxLength: number) {
  return Array.from(value.normalize('NFKC'))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32
        && code !== 127
        && ![0x200b, 0x200c, 0x200d, 0x2060, 0xfeff].includes(code)
        && !(code >= 0x202a && code <= 0x202e)
        && !(code >= 0x2066 && code <= 0x2069);
    })
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
  if (value.length < 12) throw new AppError('La contraseña debe tener al menos 12 caracteres.', 'weak_password');
  if (value.length > 128) throw new AppError('La contraseña es demasiado larga.', 'weak_password');
  if (!/[a-záéíóúñ]/.test(value) || !/[A-ZÁÉÍÓÚÑ]/.test(value) || !/\d/.test(value)) {
    throw new AppError('Incluye mayúsculas, minúsculas y al menos un número.', 'weak_password');
  }
  return value;
}

// No aplica reglas nuevas a la contraseña de una cuenta que ya existe.
export function validateCurrentPassword(value: string) {
  if (!value || value.length > 128) throw new AppError('Ingresa tu contraseña actual.', 'invalid_password');
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
  if (parsed.username || parsed.password || parsed.port || value.length > 2048) throw new AppError('El enlace contiene datos no permitidos.', 'invalid_url');
  if (allowedHosts && !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new AppError('Ese dominio todavía no es compatible.', 'unsupported_domain');
  }
  return parsed.toString();
}
