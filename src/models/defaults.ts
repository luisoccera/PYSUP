import { AppPreferences, Review } from './types';

export const defaultPreferences: AppPreferences = {
  pushNotifications: true,
  friendActivity: true,
  forumReplies: true,
  hideSpoilers: true,
  publicActivity: false,
  autoplayTrailers: false,
  wifiOnly: true,
};

export const seedReviews: Review[] = [
  {
    id: 'r1',
    contentId: 'orbit-9',
    rating: 5,
    text: 'Ciencia ficción con ideas grandes y personajes que sí se sienten humanos. El episodio seis es extraordinario.',
    date: 'Hace 4 días',
    likes: 18,
  },
  {
    id: 'r2',
    contentId: 'the-last-lantern',
    rating: 4,
    text: 'La fotografía sostiene una historia tranquila. Me habría gustado un cierre menos explicado.',
    date: '18 jul',
    likes: 9,
  },
];
