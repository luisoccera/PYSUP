import React from 'react';
import { ProviderId } from '../models/types';
import { MainView } from '../views/MainView';
import { useMainController } from './useMainController';

type MainControllerProps = {
  userId: string;
  username: string;
  initialBio: string;
  avatarPath?: string | null;
  coverPath?: string | null;
  isDemo: boolean;
  initialName: string;
  country: string;
  initialConnected: ProviderId[];
  onLogout: () => void;
  onLogoutAll: () => void;
};

export function MainController({
  userId,
  username,
  initialBio,
  avatarPath,
  coverPath,
  isDemo,
  initialName,
  country,
  initialConnected,
  onLogout,
  onLogoutAll,
}: MainControllerProps) {
  const controller = useMainController({ userId, username, initialBio, avatarPath, coverPath, isDemo, initialName, country, initialConnected });
  return <MainView controller={controller} onLogout={onLogout} onLogoutAll={onLogoutAll} />;
}
