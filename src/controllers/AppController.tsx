import React from 'react';
import { AppLoadingView } from '../views/AppLoadingView';
import { AuthController, OnboardingController } from './AuthController';
import { MainController } from './MainController';
import { useAppController } from './useAppController';

export function AppController() {
  const controller = useAppController();

  if (controller.loading) return <AppLoadingView />;
  if (!controller.session) return <AuthController onAuthenticated={controller.authenticate} />;
  if (!controller.session.onboarded) {
    return (
      <OnboardingController
        name={controller.session.name}
        onComplete={controller.completeOnboarding}
      />
    );
  }

  return (
    <MainController
      initialName={controller.session.name}
      country={controller.session.country}
      initialConnected={controller.session.connectedProviders}
      onLogout={controller.logout}
    />
  );
}
