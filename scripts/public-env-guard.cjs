function hasPrivateCredential(value) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}|gh[opusr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)) return true;
  for (const token of value.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') return true;
    } catch { /* Un dominio con puntos no es necesariamente un JWT. */ }
  }
  return false;
}

function assertPublicEnvironment(environment) {
  for (const [name, raw] of Object.entries(environment)) {
    if (!name.startsWith('EXPO_PUBLIC_') || !raw) continue;
    const value = String(raw);
    if (/(SERVICE_ROLE|CLIENT_SECRET|PRIVATE_KEY|ACCESS_TOKEN|PASSWORD)/.test(name) || hasPrivateCredential(value)) {
      // Nunca imprime el valor ni permite que Metro lo incorpore al bundle.
      throw new Error(`La variable pública ${name} contiene una credencial privada. Muévela a los secretos del servidor antes de compilar.`);
    }
    if (name.endsWith('_URL')) {
      let url;
      try { url = new URL(value); } catch { throw new Error(`La URL pública ${name} no es válida.`); }
      if (url.username || url.password || [...url.searchParams.keys()].some((key) => /^(token|secret|password|api_key|access_token|authorization)$/i.test(key))) {
        throw new Error(`La URL pública ${name} no debe incluir credenciales.`);
      }
    }
  }
}

module.exports = { assertPublicEnvironment };
