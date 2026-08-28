import React from 'react';
import { AppLoadingView } from '../views/AppLoadingView';
import { FatalStateView, PasswordRecoveryView } from '../views/SystemStateViews';
import { AuthController, OnboardingController } from './AuthController';
import { MainController } from './MainController';
import { useAppController } from './useAppController';

export function AppController() {
  const controller = useAppController();

  if (controller.loading) return <AppLoadingView />;
  if (controller.fatalError && !controller.session) return <FatalStateView message={controller.fatalError} onRetry={controller.retryInitialization} />;
  if (controller.passwordRecovery) return <PasswordRecoveryView onSubmit={controller.completePasswordRecovery} />;
  if (!controller.session) return <AuthController onDemo={controller.enterDemo} />;
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
      userId={controller.session.userId}
      username={controller.session.username}
      initialBio={controller.session.bio ?? ''}
      avatarPath={controller.session.avatarPath}
      coverPath={controller.session.coverPath}
      isDemo={Boolean(controller.session.demo)}
      country={controller.session.country}
      initialConnected={controller.session.connectedProviders}
      onLogout={() => { void controller.logout(); }}
      onLogoutAll={() => { void controller.logout(true); }}
    />
  );
}
