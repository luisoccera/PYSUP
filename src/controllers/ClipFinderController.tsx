import React from 'react';
import { ContentItem } from '../models/types';
import { ClipFinderView } from '../views/screens/ClipFinderView';
import { useClipFinderController } from './useClipFinderController';

export function ClipFinderController({ onOpen }: { onOpen: (item: ContentItem) => void }) {
  const controller = useClipFinderController();
  return <ClipFinderView controller={controller} onOpen={onOpen} />;
}
