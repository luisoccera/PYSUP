import { adminClient, internalError, json, verifySharedSecret } from '../_shared/client.ts';
import { readLimitedText } from '../_shared/security.ts';

type ProviderItem = {
  externalId: string;
  title: string;
  type: 'movie' | 'series' | 'anime';
  year?: number;
  durationMinutes?: number;
  maturity?: string;
  synopsis?: string;
  score?: number;
  popularity?: number;
  discoveryScore?: number;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  genres?: string[];
  moods?: string[];
  availability?: { providerKey: string; country: string; access: 'subscription' | 'rent' | 'purchase'; url: string; price?: number; currency?: string; expiresAt?: string }[];
};

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  if (!await verifySharedSecret(request, 'x-cron-secret', 'CRON_SECRET')) return json(request, { error: 'unauthorized' }, 401);
  const providerUrl = Deno.env.get('CATALOG_PROVIDER_URL');
  const providerToken = Deno.env.get('CATALOG_PROVIDER_TOKEN');
  if (!providerUrl?.startsWith('https://') || !providerToken) return json(request, { error: 'catalog_provider_not_configured' }, 503);
  try {
    const sourceName = (Deno.env.get('CATALOG_PROVIDER_NAME') ?? 'external').replace(/[^a-z0-9_-]/gi, '').slice(0, 60) || 'external';
    const response = await fetch(providerUrl, { redirect: 'error', headers: { Authorization: `Bearer ${providerToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`catalog_http_${response.status}`);
    const providerPayload = await readLimitedText(response, 5 * 1024 * 1024, 'catalog_response_too_large');
    const payload = JSON.parse(providerPayload) as { items?: ProviderItem[] };
    const items = (payload.items ?? []).slice(0, 500);
    const admin = adminClient();
    let synchronized = 0;
    for (const item of items) {
      if (!item.externalId || item.externalId.length > 200 || !item.title || !['movie', 'series', 'anime'].includes(item.type)) continue;
      const { data: content, error } = await admin.from('content_items').upsert({
        external_id: item.externalId,
        source_name: sourceName,
        title: item.title.slice(0, 300),
        content_type: item.type,
        release_year: item.year ?? null,
        duration_minutes: item.durationMinutes ?? null,
        maturity_rating: item.maturity ?? null,
        synopsis: (item.synopsis ?? '').slice(0, 10_000),
        score: typeof item.score === 'number' && item.score >= 0 && item.score <= 10 ? item.score : null,
        popularity: typeof item.popularity === 'number' && item.popularity >= 0 && item.popularity <= 1 ? item.popularity : 0,
        discovery_score: typeof item.discoveryScore === 'number' && item.discoveryScore >= 0 && item.discoveryScore <= 1 ? item.discoveryScore : 0.5,
        mood_tags: (item.moods ?? []).map((mood) => mood.trim().toLowerCase()).filter(Boolean).slice(0, 12),
        poster_url: item.posterUrl ?? null,
        backdrop_url: item.backdropUrl ?? null,
        trailer_url: item.trailerUrl ?? null,
        source_updated_at: new Date().toISOString(),
        deleted_at: null,
      }, { onConflict: 'source_name,external_id' }).select('id').single();
      if (error || !content) throw error ?? new Error('content_upsert_failed');
      for (const offer of item.availability ?? []) {
        const { data: provider } = await admin.from('content_providers').select('id').eq('provider_key', offer.providerKey).maybeSingle();
        if (!provider || !/^[A-Z]{2}$/.test(offer.country) || !offer.url.startsWith('https://')) continue;
        await admin.from('content_availability').upsert({
          content_id: content.id,
          provider_id: provider.id,
          country_code: offer.country,
          status: 'available',
          access_type: offer.access,
          official_url: offer.url,
          price_amount: offer.price ?? null,
          price_currency: offer.currency ?? null,
          checked_at: new Date().toISOString(),
          expires_at: offer.expiresAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString(),
          deleted_at: null,
        }, { onConflict: 'content_id,provider_id,country_code,access_type' });
      }
      synchronized += 1;
    }
    return json(request, { synchronized });
  } catch (error) {
    return internalError(request, 'catalog_sync_failed', error);
  }
});
