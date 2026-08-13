import { useEffect, useState } from 'react';
import { sessionRepository } from '../models/sessionRepository';
import { OnboardingResult, Session } from '../models/types';

export function useAppController() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    sessionRepository.load()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const persistSession = (next: Session) => {
    setSession(next);
    sessionRepository.save(next).catch(() => undefined);
  };

  const authenticate = (name: string, skipOnboarding = false) => {
    persistSession({
      name,
      country: 'MX',
      connectedProviders: [],
      onboarded: skipOnboarding,
    });
  };

  const completeOnboarding = (result: OnboardingResult) => {
    if (!session) return;
    persistSession({ ...session, ...result, onboarded: true });
  };

  const logout = () => {
    setSession(null);
    sessionRepository.clear().catch(() => undefined);
  };

  return { loading, session, authenticate, completeOnboarding, logout };
}
