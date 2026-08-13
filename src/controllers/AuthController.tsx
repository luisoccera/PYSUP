import React from 'react';
import { OnboardingResult } from '../models/types';
import { AuthView } from '../views/screens/AuthView';
import { OnboardingView } from '../views/screens/OnboardingView';
import { useAuthController, useOnboardingController } from './useAuthController';

export function AuthController({ onAuthenticated }: { onAuthenticated: (name: string, skipOnboarding?: boolean) => void }) {
  const controller = useAuthController(onAuthenticated);
  return <AuthView controller={controller} />;
}

export function OnboardingController({ name, onComplete }: { name: string; onComplete: (result: OnboardingResult) => void }) {
  const controller = useOnboardingController(onComplete);
  return <OnboardingView name={name} controller={controller} />;
}
