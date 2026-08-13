import { catalogue } from './catalogue';
import { HiddenGemProfile, Review, RouletteRecommendation } from './types';

const hiddenGemProfiles: HiddenGemProfile[] = [
  {
    contentId: 'signal-noir',
    obscurity: 91,
    exposure: 14,
    whyForgotten: 'Tuvo una salida pequeña y nunca entró en las listas de tendencia.',
    editorialSignal: 'Muy valorada por quienes terminan thrillers de ciencia ficción pausados.',
  },
  {
    contentId: 'after-the-rain',
    obscurity: 88,
    exposure: 19,
    whyForgotten: 'Quedó escondida entre estrenos de mayor presupuesto a pesar de su alta finalización.',
    editorialSignal: 'Conecta especialmente con quienes prefieren dramas íntimos y temporadas cerradas.',
  },
  {
    contentId: 'orbit-9',
    obscurity: 82,
    exposure: 26,
    whyForgotten: 'Su estreno fue discreto y la conversación creció semanas después.',
    editorialSignal: 'Tiene una comunidad pequeña, pero reseñas consistentemente detalladas.',
  },
  {
    contentId: 'paper-gods',
    obscurity: 94,
    exposure: 9,
    whyForgotten: 'No apareció en portada fuera de su semana de estreno.',
    editorialSignal: 'Destaca entre usuarios que combinan fantasía, misterio y protagonistas ingeniosos.',
  },
  {
    contentId: 'the-last-lantern',
    obscurity: 90,
    exposure: 12,
    whyForgotten: 'La recomendación automática la desplazó por títulos con más reproducciones iniciales.',
    editorialSignal: 'Mantiene mejor valoración entre quienes disfrutan historias contemplativas.',
  },
];

type RouletteInput = {
  likedIds: string[];
  savedIds: string[];
  reviews: Review[];
  country: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function addGenreSignals(weights: Map<string, number>, contentId: string, value: number) {
  const item = catalogue.find((candidate) => candidate.id === contentId);
  item?.genres.forEach((genre) => weights.set(genre, (weights.get(genre) ?? 0) + value));
}

export function buildTasteProfile({ likedIds, savedIds, reviews }: Omit<RouletteInput, 'country'>) {
  const weights = new Map<string, number>();
  likedIds.forEach((id) => addGenreSignals(weights, id, 4));
  savedIds.forEach((id) => addGenreSignals(weights, id, 2));
  reviews.forEach((review) => addGenreSignals(weights, review.contentId, review.rating >= 4 ? review.rating : -2));
  return [...weights.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([genre]) => genre)
    .slice(0, 3);
}

export function buildHiddenGemRecommendations(input: RouletteInput): RouletteRecommendation[] {
  const tasteSignals = buildTasteProfile(input);
  const reviewedIds = new Set(input.reviews.map((review) => review.contentId));
  const genreWeights = new Map<string, number>();
  input.likedIds.forEach((id) => addGenreSignals(genreWeights, id, 4));
  input.savedIds.forEach((id) => addGenreSignals(genreWeights, id, 2));
  input.reviews.forEach((review) => addGenreSignals(genreWeights, review.contentId, review.rating >= 4 ? review.rating : -2));

  const available = catalogue.filter((item) => item.countries.includes(input.country));
  const unseen = available.filter((item) => !reviewedIds.has(item.id));
  const pool = unseen.length >= 2 ? unseen : available;

  return pool.map((content) => {
    const profile = hiddenGemProfiles.find((candidate) => candidate.contentId === content.id)!;
    const genreSignal = content.genres.reduce((total, genre) => total + (genreWeights.get(genre) ?? 0), 0);
    const affinity = clamp(64 + genreSignal * 3, 64, 98);
    const score = Math.round((affinity * 0.72) + (profile.obscurity * 0.38) - (profile.exposure * 0.1));
    return {
      content,
      affinity,
      obscurity: profile.obscurity,
      score: clamp(score, 0, 99),
      whyForgotten: profile.whyForgotten,
      editorialSignal: profile.editorialSignal,
      tasteSignals: content.genres.filter((genre) => tasteSignals.includes(genre)).slice(0, 2),
    };
  }).sort((left, right) => right.score - left.score);
}
