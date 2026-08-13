import { useEffect, useMemo, useState } from 'react';
import { buildHiddenGemRecommendations, buildTasteProfile } from '../models/roulette';
import { Review } from '../models/types';

type RouletteControllerOptions = {
  likedIds: string[];
  savedIds: string[];
  reviews: Review[];
  country: string;
};

export function useRouletteController(options: RouletteControllerOptions) {
  const recommendations = useMemo(() => buildHiddenGemRecommendations(options), [
    options.country,
    options.likedIds,
    options.reviews,
    options.savedIds,
  ]);
  const tasteProfile = useMemo(() => buildTasteProfile(options), [
    options.likedIds,
    options.reviews,
    options.savedIds,
  ]);
  const [resultId, setResultId] = useState(recommendations[0]?.content.id ?? '');
  const [spinCount, setSpinCount] = useState(0);

  useEffect(() => {
    if (!recommendations.some((item) => item.content.id === resultId)) {
      setResultId(recommendations[0]?.content.id ?? '');
    }
  }, [recommendations, resultId]);

  const spin = () => {
    if (recommendations.length < 2) return;
    setSpinCount((current) => {
      const nextCount = current + 1;
      const currentIndex = Math.max(0, recommendations.findIndex((item) => item.content.id === resultId));
      const nextIndex = (currentIndex + 1 + (nextCount % Math.max(1, recommendations.length - 1))) % recommendations.length;
      setResultId(recommendations[nextIndex].content.id);
      return nextCount;
    });
  };

  return {
    recommendations,
    result: recommendations.find((item) => item.content.id === resultId) ?? recommendations[0] ?? null,
    tasteProfile,
    spinCount,
    spin,
  };
}

export type RouletteControllerState = ReturnType<typeof useRouletteController>;
