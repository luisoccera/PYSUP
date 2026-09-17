import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { constantTimeSecretMatch, originAllowed, readLimitedText } from './security.ts';

const encoder = new TextEncoder();
const MAX_JSON_RESPONSE_BYTES = 64 * 1024;

function configuredOrigins() {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | null) {
  return originAllowed(origin, configuredOrigins(), Deno.env.get('APP_ENV') === 'development');
}

export function assertAllowedOrigin(request: Request) {
  if (!isAllowedOrigin(request.headers.get('Origin'))) throw new Error('origin_not_allowed');
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  return {
    ...(origin && isAllowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

export function handleCorsPreflight(request: Request) {
  if (!isAllowedOrigin(request.headers.get('Origin'))) return json(request, { error: 'origin_not_allowed' }, 403);
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200, maxBytes = MAX_JSON_RESPONSE_BYTES) {
  const encoded = JSON.stringify(body);
  if (encoder.encode(encoded).byteLength > maxBytes) {
    return new Response('{"error":"response_too_large"}', {
      status: 500,
      headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(encoded, {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function readJsonBody<T>(request: Request, maxBytes = 16 * 1024): Promise<T> {
  const contentType = request.headers.get('Content-Type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) throw new Error('invalid_content_type');
  const raw = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('invalid_json');
  }
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function verifySharedSecret(request: Request, headerName: string, envName: string) {
  const provided = request.headers.get(headerName) ?? '';
  const expected = Deno.env.get(envName) ?? '';
  return constantTimeSecretMatch(provided, expected);
}

export async function hashClientAddress(request: Request) {
  const salt = Deno.env.get('SECURITY_HASH_SALT');
  if (!salt) return null;
  const address = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!address) return null;
  const bytes = await digest(`${salt}:${address}`);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('server_configuration_incomplete');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticatedUser(request: Request) {
  assertAllowedOrigin(request);
  const authorization = request.headers.get('Authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9._~-]{20,4096}$/.test(authorization)) throw new Error('authentication_required');
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !publishableKey) throw new Error('server_configuration_incomplete');
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('invalid_or_expired_session');
  return data.user;
}

export function internalError(request: Request, publicCode: string, error: unknown, status = 500) {
  console.error(publicCode, error instanceof Error ? error.name : 'server_error');
  return json(request, { error: publicCode }, status);
}

export async function consumeSecurityBudget(userId: string, eventType: string, limit: number, seconds: number, request: Request) {
  const { data, error } = await adminClient().rpc('consume_security_budget', {
    selected_user_id: userId,
    selected_event_type: eventType,
    allowed_count: limit,
    window_seconds: seconds,
    selected_ip_hash: await hashClientAddress(request),
  });
  if (error) throw new Error('security_budget_unavailable');
  return data === true;
}
