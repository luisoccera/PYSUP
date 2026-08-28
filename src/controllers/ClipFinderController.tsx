import React from 'react';
import { ContentItem } from '../models/types';
import { ClipFinderView } from '../views/screens/ClipFinderView';
import { useClipFinderController } from './useClipFinderController';

export function ClipFinderController({ country, wifiOnly, onOpen }: { country: string; wifiOnly: boolean; onOpen: (item: ContentItem) => void }) {
  const controller = useClipFinderController(country, wifiOnly);
  return <ClipFinderView controller={controller} onOpen={onOpen} />;
}
