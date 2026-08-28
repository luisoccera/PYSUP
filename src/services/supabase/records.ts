import type { ProviderId, RouletteFormat } from '../../models/types';

export type ProfileRecord = {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  country_code: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PreferencesRecord = {
  user_id: string;
  push_notifications: boolean;
  friend_activity: boolean;
  forum_replies: boolean;
  hide_spoilers: boolean;
  public_activity: boolean;
  autoplay_trailers: boolean;
  wifi_only: boolean;
  preferred_format: RouletteFormat;
};

export type ContentRecord = {
  id: string;
  external_id: string | null;
  title: string;
  content_type: 'movie' | 'series' | 'anime';
  release_year: number | null;
  duration_minutes: number | null;
  maturity_rating: string | null;
  synopsis: string;
  score: number | null;
  popularity: number;
  discovery_score: number;
  mood_tags?: string[];
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  genres?: { genres: { name: string } | null }[];
};

export type AvailabilityRecord = {
  id: string;
  content_id: string;
  country_code: string;
  access_type: 'subscription' | 'rent' | 'purchase';
  status: 'available' | 'unavailable' | 'unknown';
  official_url: string;
  price_amount: number | null;
  price_currency: string | null;
  checked_at: string;
  expires_at: string | null;
  content_providers: {
    provider_key: ProviderId | 'apple';
    name: string;
    brand_color: string;
  } | null;
};

export type NotificationRecord = {
  id: string;
  type: 'direct_message' | 'friend_request' | 'room_invite' | 'forum_reply' | 'review_like' | 'recommendation' | 'system';
  title: string;
  body: string;
  destination: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type ProviderSelection = {
  providerId: ProviderId;
  connectionType: 'manual' | 'oauth' | 'import';
};
