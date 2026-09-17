export function originAllowed(origin: string | null, allowedOrigins: string[], development = false) {
  if (!origin) return true; // Las aplicaciones nativas no envían Origin; aún requieren JWT.
  return allowedOrigins.includes(origin)
    || (development && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

export async function readLimitedText(source: Request | Response, maxBytes: number, errorCode = 'request_too_large') {
  if (Number(source.headers.get('Content-Length') ?? 0) > maxBytes) throw new Error(errorCode);
  if (!source.body) return '';
  const reader = source.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(errorCode);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function constantTimeSecretMatch(provided: string, expected: string) {
  if (!provided || !expected || provided.length > 1024 || expected.length > 1024) return false;
  const encoder = new TextEncoder();
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  const [left, right] = await Promise.all([hash(provided), hash(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}
