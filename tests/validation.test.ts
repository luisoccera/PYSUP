import { describe, expect, it } from 'vitest';
import { sanitizePlainText, validateEmail, validateHttpsUrl, validatePassword, validateUsername } from '../src/utils/validation';

describe('autenticación y validación', () => {
  it('normaliza correos y rechaza formatos arbitrarios', () => {
    expect(validateEmail('  Persona@Ejemplo.com ')).toBe('persona@ejemplo.com');
    expect(() => validateEmail('no-es-correo')).toThrow('correo válido');
  });

  it('aplica límites a registro, recuperación y perfil', () => {
    expect(validatePassword('12345678')).toBe('12345678');
    expect(() => validatePassword('corta')).toThrow('8 caracteres');
    expect(validateUsername(' Cine_Fan ')).toBe('cine_fan');
    expect(sanitizePlainText(' hola\u0000 mundo ', 20)).toBe('hola mundo');
  });

  it('sólo admite enlaces HTTPS y dominios autorizados', () => {
    expect(validateHttpsUrl('https://vm.tiktok.com/abc', ['tiktok.com'])).toContain('tiktok.com');
    expect(() => validateHttpsUrl('http://x.com/video', ['x.com'])).toThrow('HTTPS');
    expect(() => validateHttpsUrl('https://sitio-falso.example/video', ['x.com'])).toThrow('dominio');
  });
});
