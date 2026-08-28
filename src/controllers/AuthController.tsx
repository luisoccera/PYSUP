import React from 'react';
import { OnboardingResult } from '../models/types';
import { AuthView } from '../views/screens/AuthView';
import { OnboardingView } from '../views/screens/OnboardingView';
import { useAuthController, useOnboardingController } from './useAuthController';

export function AuthController({ onDemo }: { onDemo: () => Promise<void> }) {
  const controller = useAuthController(onDemo);
  return <AuthView controller={controller} />;
}

export function OnboardingController({ name, onComplete }: { name: string; onComplete: (result: OnboardingResult) => Promise<void> }) {
  const controller = useOnboardingController(onComplete);
  return <OnboardingView name={name} controller={controller} />;
}
