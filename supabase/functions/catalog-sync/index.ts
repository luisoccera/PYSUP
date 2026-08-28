import { adminClient, json } from '../_shared/client.ts';

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
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const providerUrl = Deno.env.get('CATALOG_PROVIDER_URL');
  const providerToken = Deno.env.get('CATALOG_PROVIDER_TOKEN');
  if (!providerUrl || !providerToken) return json({ error: 'catalog_provider_not_configured' }, 503);
  try {
    const sourceName = Deno.env.get('CATALOG_PROVIDER_NAME') ?? 'external';
    const response = await fetch(providerUrl, { headers: { Authorization: `Bearer ${providerToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`catalog_http_${response.status}`);
    const payload = await response.json() as { items?: ProviderItem[] };
    const items = (payload.items ?? []).slice(0, 1000);
    const admin = adminClient();
    let synchronized = 0;
    for (const item of items) {
      if (!item.externalId || !item.title || !['movie', 'series', 'anime'].includes(item.type)) continue;
      const { data: content, error } = await admin.from('content_items').upsert({
        external_id: item.externalId,
        source_name: sourceName,
        title: item.title.slice(0, 300),
        content_type: item.type,
        release_year: item.year ?? null,
        duration_minutes: item.durationMinutes ?? null,
        maturity_rating: item.maturity ?? null,
        synopsis: item.synopsis ?? '',
        score: item.score ?? null,
        popularity: item.popularity ?? 0,
        discovery_score: item.discoveryScore ?? 0.5,
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
    return json({ synchronized });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'catalog_sync_failed' }, 500);
  }
});
