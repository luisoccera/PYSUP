import type {
  ContentAvailability,
  ContentItem,
  RouletteFormat,
  WatchOffer,
} from '../../models/types';
import { catalogue } from '../../models/catalogue';
import { getSupabase, requireUserId } from '../supabase/client';
import type { AvailabilityRecord, ContentRecord } from '../supabase/records';

const fallbackPalette: [string, string] = ['#23314D', '#10131E'];

function contentType(value: ContentRecord['content_type']): ContentItem['type'] {
  if (value === 'movie') return 'Película';
  if (value === 'anime') return 'Anime';
  return 'Serie';
}

export function mapContent(row: ContentRecord): ContentItem {
  const genres = row.genres?.flatMap((entry) => entry.genres?.name ? [entry.genres.name] : []) ?? [];
  const localArtwork = catalogue.find((item) => item.id === row.external_id);
  return {
    id: row.id,
    title: row.title,
    subtitle: `${contentType(row.content_type)} · ${row.release_year ?? 'Sin año'}`,
    type: contentType(row.content_type),
    year: row.release_year ?? 0,
    duration: row.duration_minutes ? `${row.duration_minutes} min` : 'Duración no disponible',
    maturity: row.maturity_rating ?? 'Sin clasificación',
    score: row.score ?? 0,
    match: 0,
    genres,
    providers: [],
    countries: [],
    image: row.poster_url ? { uri: row.poster_url } : localArtwork?.image ?? catalogue[0].image,
    palette: localArtwork?.palette ?? fallbackPalette,
    synopsis: row.synopsis,
    reason: localArtwork?.reason ?? 'Coincide con las señales que has guardado en PYSUP.',
    friendSignal: '',
  };
}

function mapAvailability(rows: AvailabilityRecord[], trailerUrl = ''): ContentAvailability {
  const offers: WatchOffer[] = rows
    .filter((row) => row.status === 'available' && row.content_providers
      && Date.parse(row.checked_at) >= Date.now() - 7 * 24 * 60 * 60 * 1000
      && (!row.expires_at || Date.parse(row.expires_at) > Date.now()))
    .map((row) => ({
      platformId: row.content_providers!.provider_key,
      platformName: row.content_providers!.name,
      access: row.access_type,
      accessLabel: row.access_type === 'subscription' ? 'Suscripción' : row.access_type === 'rent' ? 'Renta' : 'Compra',
      color: row.content_providers!.brand_color,
      url: row.official_url,
    }));
  return { trailerUrl, offers };
}

export type CatalogProvider = {
  search(query: string): Promise<ContentItem[]>;
  getContent(id: string): Promise<ContentItem | null>;
  getAvailability(contentId: string, country: string): Promise<ContentAvailability>;
};

export const catalogRepository: CatalogProvider & {
  getRecommendations(options: { country: string; format?: RouletteFormat; mood?: string; limit?: number; source?: 'deck' | 'roulette' }): Promise<ContentItem[]>;
} = {
  async search(query) {
    const clean = query.trim().slice(0, 100);
    if (!clean) return [];
    const { data, error } = await getSupabase()
      .from('content_items')
      .select('*,genres:content_genres(genres(name))')
      .is('deleted_at', null)
      .ilike('title', `%${clean.replace(/[%_]/g, '')}%`)
      .limit(30);
    if (error) throw error;
    return (data as ContentRecord[]).map(mapContent);
  },

  async getContent(id) {
    const { data, error } = await getSupabase()
      .from('content_items')
      .select('*,genres:content_genres(genres(name))')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data ? mapContent(data as ContentRecord) : null;
  },

  async getAvailability(contentId, country) {
    const [{ data: content, error: contentError }, { data, error }] = await Promise.all([
      getSupabase().from('content_items').select('trailer_url').eq('id', contentId).single(),
      getSupabase()
        .from('content_availability')
        .select('*,content_providers(provider_key,name,brand_color)')
        .eq('content_id', contentId)
        .eq('country_code', country.toUpperCase())
        .is('deleted_at', null)
        .order('checked_at', { ascending: false }),
    ]);
    if (contentError) throw contentError;
    if (error) throw error;
    return mapAvailability(data as AvailabilityRecord[], content.trailer_url ?? '');
  },

  async getRecommendations({ country, format = 'any', mood, limit = 20, source = 'deck' }) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().rpc('get_personalized_recommendations', {
      selected_country: country.toUpperCase(),
      selected_format: format,
      selected_mood: mood ?? null,
      result_limit: Math.min(Math.max(limit, 1), 50),
    });
    if (error) throw error;
    const rankedRows = (data ?? []) as ContentRecord[];
    const hydrated = await Promise.all(rankedRows.map((row) => this.getContent(row.id)));
    const items = hydrated.flatMap((item) => item ? [item] : []);
    if (items.length) {
      const { error: trackingError } = await getSupabase().from('recommendations').insert(items.map((item) => ({
        user_id: userId,
        content_id: item.id,
        recommendation_source: source,
        reasons: { country: country.toUpperCase(), format, mood: mood ?? null },
      })));
      if (trackingError) throw trackingError;
    }
    return items;
  },
};
