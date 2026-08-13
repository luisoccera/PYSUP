import React from 'react';
import { ProviderId } from '../models/types';
import { MainView } from '../views/MainView';
import { useMainController } from './useMainController';

type MainControllerProps = {
  initialName: string;
  country: string;
  initialConnected: ProviderId[];
  onLogout: () => void;
};

export function MainController({
  initialName,
  country,
  initialConnected,
  onLogout,
}: MainControllerProps) {
  const controller = useMainController({ initialName, country, initialConnected });
  return <MainView controller={controller} onLogout={onLogout} />;
}
