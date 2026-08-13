import type { ImageSourcePropType } from 'react-native';

export type ProviderId = 'netflix' | 'max' | 'disney' | 'crunchyroll' | 'prime';

export type Provider = {
  id: ProviderId;
  name: string;
  shortName: string;
  color: string;
  foreground: string;
};

export type ContentItem = {
  id: string;
  title: string;
  subtitle: string;
  type: 'Película' | 'Serie' | 'Anime';
  year: number;
  duration: string;
  maturity: string;
  score: number;
  match: number;
  genres: string[];
  providers: ProviderId[];
  countries: string[];
  image: ImageSourcePropType;
  palette: [string, string];
  synopsis: string;
  reason: string;
  friendSignal: string;
};

export type ForumTopic = {
  id: string;
  kind: 'discussion' | 'identify';
  title: string;
  body: string;
  author: string;
  initials: string;
  time: string;
  tags: string[];
  replies: number;
  likes: number;
  solved?: boolean;
};

export type Friend = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  compatibility: number;
  status: string;
  online: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: 'me' | string;
  text: string;
  sentAt: string;
  status?: 'sent' | 'read';
};

export type FriendsMode = 'messages' | 'room';

export type Review = {
  id: string;
  contentId: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
};

export type TabId = 'home' | 'discover' | 'roulette' | 'forum' | 'friends' | 'profile' | 'settings';

export type NotificationDestination =
  | { kind: 'content'; contentId: string }
  | { kind: 'forum'; topicId: string }
  | { kind: 'friend'; friendId: string }
  | { kind: 'room'; friendId: string }
  | { kind: 'profile'; reviewId?: string }
  | { kind: 'roulette' };

export type AppNotification = {
  id: string;
  icon: 'users' | 'message-circle' | 'heart' | 'film' | 'message-square';
  title: string;
  text: string;
  color: string;
  destination: NotificationDestination;
};

export type HiddenGemProfile = {
  contentId: string;
  obscurity: number;
  exposure: number;
  moods: RouletteMood[];
  whyForgotten: string;
  editorialSignal: string;
};

export type RouletteMood = 'uplifting' | 'intense' | 'calm' | 'thoughtful';

export type RouletteFormat = 'any' | 'movie' | 'series';

export type WatchAccess = 'subscription' | 'rent' | 'purchase';

export type WatchPlatformId = ProviderId | 'apple';

export type WatchOffer = {
  platformId: WatchPlatformId;
  platformName: string;
  access: WatchAccess;
  accessLabel: string;
  color: string;
  url: string;
};

export type ContentAvailability = {
  trailerUrl: string;
  offers: WatchOffer[];
};

export type RouletteRecommendation = {
  content: ContentItem;
  affinity: number;
  obscurity: number;
  score: number;
  whyForgotten: string;
  editorialSignal: string;
  tasteSignals: string[];
  availability: ContentAvailability;
};

export type PreferenceKey =
  | 'pushNotifications'
  | 'friendActivity'
  | 'forumReplies'
  | 'hideSpoilers'
  | 'publicActivity'
  | 'autoplayTrailers'
  | 'wifiOnly';

export type AppPreferences = Record<PreferenceKey, boolean>;

export type Session = {
  name: string;
  country: string;
  connectedProviders: ProviderId[];
  onboarded: boolean;
};

export type OnboardingResult = {
  country: string;
  connectedProviders: ProviderId[];
  preferredGenres: string[];
};

export type ClipSourceKind = 'link' | 'file';
export type ClipAnalysisState = 'idle' | 'extracting' | 'matching' | 'catalogue' | 'complete';
