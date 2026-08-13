import {
  ContentAvailability,
  ContentItem,
  ProviderId,
  WatchAccess,
  WatchOffer,
  WatchPlatformId,
} from './types';

type WatchPlatform = {
  id: WatchPlatformId;
  name: string;
  color: string;
  searchUrl: (title: string) => string;
};

type ExtraOfferSeed = {
  contentId: string;
  platformId: WatchPlatformId;
  access: WatchAccess;
  countries: string[];
};

const watchPlatforms: Record<WatchPlatformId, WatchPlatform> = {
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    color: '#E50914',
    searchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  },
  max: {
    id: 'max',
    name: 'Max',
    color: '#6A3DFF',
    searchUrl: (title) => `https://play.max.com/search?q=${encodeURIComponent(title)}`,
  },
  disney: {
    id: 'disney',
    name: 'Disney+',
    color: '#0B65D8',
    searchUrl: () => 'https://www.disneyplus.com/search',
  },
  crunchyroll: {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    color: '#F47521',
    searchUrl: (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
  },
  prime: {
    id: 'prime',
    name: 'Prime Video',
    color: '#1399FF',
    searchUrl: (title) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`,
  },
  apple: {
    id: 'apple',
    name: 'Apple TV',
    color: '#F5F5F7',
    searchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  },
};

const accessLabels: Record<WatchAccess, string> = {
  subscription: 'Suscripción',
  rent: 'Renta',
  purchase: 'Compra',
};

const extraOffers: ExtraOfferSeed[] = [
  { contentId: 'signal-noir', platformId: 'prime', access: 'rent', countries: ['MX', 'ES', 'AR', 'CO'] },
  { contentId: 'signal-noir', platformId: 'apple', access: 'rent', countries: ['MX', 'ES', 'AR', 'CO'] },
  { contentId: 'after-the-rain', platformId: 'apple', access: 'purchase', countries: ['MX', 'ES', 'CO', 'CL'] },
  { contentId: 'the-last-lantern', platformId: 'prime', access: 'rent', countries: ['MX', 'ES', 'AR', 'CL'] },
  { contentId: 'the-last-lantern', platformId: 'apple', access: 'rent', countries: ['MX', 'ES', 'AR', 'CL'] },
];

function createOffer(platformId: WatchPlatformId, access: WatchAccess, title: string): WatchOffer {
  const platform = watchPlatforms[platformId];
  return {
    platformId,
    platformName: platform.name,
    access,
    accessLabel: accessLabels[access],
    color: platform.color,
    url: platform.searchUrl(title),
  };
}

function subscriptionOffers(item: ContentItem): WatchOffer[] {
  return item.providers.map((providerId: ProviderId) => createOffer(providerId, 'subscription', item.title));
}

export function getContentAvailability(item: ContentItem, country: string): ContentAvailability {
  if (!item.countries.includes(country)) {
    return {
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} tráiler`)}`,
      offers: [],
    };
  }
  const rentals = extraOffers
    .filter((offer) => offer.contentId === item.id && offer.countries.includes(country))
    .map((offer) => createOffer(offer.platformId, offer.access, item.title));

  return {
    trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} tráiler`)}`,
    offers: [...subscriptionOffers(item), ...rentals],
  };
}
