import { useEffect, useMemo, useState } from 'react';
import {
  buildHiddenGemRecommendations,
  buildTasteProfile,
  rouletteFormatOptions,
  rouletteMoodOptions,
} from '../models/roulette';
import { Review, RouletteFormat, RouletteMood } from '../models/types';

type RouletteControllerOptions = {
  likedIds: string[];
  savedIds: string[];
  reviews: Review[];
  country: string;
};

export function useRouletteController(options: RouletteControllerOptions) {
  const [selectedMood, setSelectedMoodState] = useState<RouletteMood | null>(null);
  const [selectedFormat, setSelectedFormatState] = useState<RouletteFormat>('any');
  const [resultId, setResultId] = useState('');
  const [spinCount, setSpinCount] = useState(0);

  const recommendations = useMemo(() => buildHiddenGemRecommendations({
    ...options,
    mood: selectedMood,
    format: selectedFormat,
  }), [
    options.country,
    options.likedIds,
    options.reviews,
    options.savedIds,
    selectedFormat,
    selectedMood,
  ]);
  const tasteProfile = useMemo(() => buildTasteProfile(options), [
    options.likedIds,
    options.reviews,
    options.savedIds,
  ]);

  useEffect(() => {
    if (resultId && !recommendations.some((item) => item.content.id === resultId)) {
      setResultId('');
    }
  }, [recommendations, resultId]);

  const resetReveal = () => setResultId('');
  const selectMood = (mood: RouletteMood | null) => {
    setSelectedMoodState(mood);
    resetReveal();
  };
  const selectFormat = (format: RouletteFormat) => {
    setSelectedFormatState(format);
    resetReveal();
  };

  const spin = () => {
    if (!recommendations.length) return;
    const alternatives = recommendations.filter((item) => item.content.id !== resultId);
    const pool = alternatives.length ? alternatives : recommendations;
    const totalWeight = pool.reduce((total, item) => total + Math.max(item.score, 1), 0);
    let cursor = Math.random() * totalWeight;
    const selected = pool.find((item) => {
      cursor -= Math.max(item.score, 1);
      return cursor <= 0;
    }) ?? pool[pool.length - 1];
    setResultId(selected.content.id);
    setSpinCount((current) => current + 1);
  };

  return {
    recommendations,
    result: recommendations.find((item) => item.content.id === resultId) ?? null,
    tasteProfile,
    selectedMood,
    selectedFormat,
    moodOptions: rouletteMoodOptions,
    formatOptions: rouletteFormatOptions,
    spinCount,
    spin,
    resetReveal,
    selectMood,
    selectFormat,
  };
}

export type RouletteControllerState = ReturnType<typeof useRouletteController>;
