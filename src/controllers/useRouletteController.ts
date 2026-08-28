import { useEffect, useMemo, useState } from 'react';
import { buildHiddenGemRecommendations, buildTasteProfile, rouletteFormatOptions, rouletteMoodOptions } from '../models/roulette';
import type { ContentItem, Review, RouletteFormat, RouletteMood, RouletteRecommendation } from '../models/types';
import { catalogRepository } from '../services/catalog/catalogRepository';
import { interactionRepository } from '../services/catalog/interactionRepository';
import { toAppError } from '../utils/errors';

type RouletteControllerOptions = {
  likedIds: string[];
  savedIds: string[];
  reviews: Review[];
  country: string;
  isDemo: boolean;
};

function pendingRecommendation(content: ContentItem): RouletteRecommendation {
  return {
    content,
    affinity: content.match || 0,
    obscurity: 0,
    score: 1,
    whyForgotten: '',
    editorialSignal: '',
    tasteSignals: [],
    availability: { trailerUrl: '', offers: [] },
  };
}

export function useRouletteController(options: RouletteControllerOptions) {
  const [selectedMood, setSelectedMoodState] = useState<RouletteMood | null>(null);
  const [selectedFormat, setSelectedFormatState] = useState<RouletteFormat>('any');
  const [remoteCandidates, setRemoteCandidates] = useState<RouletteRecommendation[]>([]);
  const [result, setResult] = useState<RouletteRecommendation | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoRecommendations = useMemo(() => options.isDemo ? buildHiddenGemRecommendations({
    likedIds: options.likedIds,
    savedIds: options.savedIds,
    reviews: options.reviews,
    country: options.country,
    mood: selectedMood,
    format: selectedFormat,
  }) : [], [options.country, options.isDemo, options.likedIds, options.reviews, options.savedIds, selectedFormat, selectedMood]);
  const recommendations = options.isDemo ? demoRecommendations : remoteCandidates;
  const tasteProfile = useMemo(() => buildTasteProfile(options), [options.likedIds, options.reviews, options.savedIds]);

  useEffect(() => {
    if (options.isDemo) return;
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    void catalogRepository.getRecommendations({ country: options.country, format: selectedFormat, mood: selectedMood ?? undefined, limit: 20, source: 'roulette' })
      .then((items) => { if (active) setRemoteCandidates(items.map(pendingRecommendation)); })
      .catch((caught) => { if (active) { setRemoteCandidates([]); setError(toAppError(caught).message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [options.country, options.isDemo, selectedFormat, selectedMood]);

  const resetReveal = () => setResult(null);
  const selectMood = (mood: RouletteMood | null) => { setSelectedMoodState(mood); resetReveal(); };
  const selectFormat = (format: RouletteFormat) => { setSelectedFormatState(format); resetReveal(); };

  const spin = () => {
    if (!recommendations.length || loading) return;
    const alternatives = recommendations.filter((item) => item.content.id !== result?.content.id);
    const pool = alternatives.length ? alternatives : recommendations;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    if (options.isDemo) {
      setResult(selected); setSpinCount((current) => current + 1); return;
    }
    setLoading(true);
    void catalogRepository.getAvailability(selected.content.id, options.country)
      .then((availability) => {
        setResult({ ...selected, availability });
        setSpinCount((current) => current + 1);
      })
      .catch((caught) => setError(toAppError(caught).message))
      .finally(() => setLoading(false));
  };

  const rejectResult = () => {
    if (!result) return;
    if (!options.isDemo) void interactionRepository.record(result.content.id, 'pass').catch((caught) => setError(toAppError(caught).message));
    spin();
  };

  return {
    recommendations, result, tasteProfile, selectedMood, selectedFormat,
    moodOptions: rouletteMoodOptions, formatOptions: rouletteFormatOptions,
    spinCount, loading, error, spin, rejectResult, resetReveal, selectMood, selectFormat,
  };
}

export type RouletteControllerState = ReturnType<typeof useRouletteController>;
