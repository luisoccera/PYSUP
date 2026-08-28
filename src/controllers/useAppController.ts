import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { env } from '../config/env';
import { sessionRepository } from '../models/sessionRepository';
import type { OnboardingResult, Session } from '../models/types';
import { authService } from '../services/auth/authService';
import { profileRepository } from '../services/profiles/profileRepository';
import { isSupabaseConfigured } from '../services/supabase/client';
import { toAppError } from '../utils/errors';

export function useAppController() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [initializeKey, setInitializeKey] = useState(0);
  const mounted = useRef(true);

  const hydrateUser = useCallback(async (user: User) => {
    const [profile, providers, preferredGenres] = await Promise.all([
      profileRepository.getCurrent(),
      profileRepository.getProviderSelections(),
      profileRepository.getPreferredGenres(),
    ]);
    if (!mounted.current) return;
    setSession({
      userId: user.id,
      email: user.email ?? '',
      name: profile.display_name,
      username: profile.username,
      bio: profile.bio ?? '',
      avatarPath: profile.avatar_path,
      coverPath: profile.cover_path,
      country: profile.country_code ?? '',
      connectedProviders: providers,
      preferredGenres,
      onboarded: Boolean(profile.onboarding_completed_at),
    });
    setFatalError(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | undefined;
    const initialize = async () => {
      try {
        await authService.migrateLegacySession();
        if (!isSupabaseConfigured) {
          if (env.demoMode) setSession(await sessionRepository.load());
          return;
        }
        await authService.enforceRememberPreference();
        const authSession = await authService.getSession();
        if (authSession?.user) await hydrateUser(authSession.user);
        const subscription = authService.onAuthStateChange((event, nextSession) => {
          if (event === 'PASSWORD_RECOVERY' && mounted.current) setPasswordRecovery(true);
          if (!nextSession?.user) {
            if (mounted.current) setSession(null);
            return;
          }
          void hydrateUser(nextSession.user).catch((error) => {
            if (mounted.current) setFatalError(toAppError(error).message);
          });
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        setFatalError(toAppError(error).message);
        setSession(null);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    void initialize();
    return () => {
      mounted.current = false;
      unsubscribe?.();
    };
  }, [hydrateUser, initializeKey]);

  const enterDemo = async () => {
    if (!env.demoMode) throw new Error('El modo demo está desactivado.');
    const demoSession: Session = {
      userId: 'demo-local',
      email: 'demo@pysup.local',
      name: 'Invitado',
      username: 'invitado',
      bio: '',
      country: 'MX',
      connectedProviders: [],
      preferredGenres: ['Ciencia ficción', 'Misterio'],
      onboarded: true,
      demo: true,
    };
    await sessionRepository.save(demoSession);
    setSession(demoSession);
  };

  const completeOnboarding = async (result: OnboardingResult) => {
    if (!session) return;
    if (!session.demo) await profileRepository.completeOnboarding(result);
    const next = { ...session, ...result, onboarded: true };
    setSession(next);
    if (session.demo) await sessionRepository.save(next);
  };

  const logout = async (allDevices = false) => {
    if (session?.demo) await sessionRepository.clear();
    else if (isSupabaseConfigured) await authService.signOut(allDevices);
    setSession(null);
  };

  const retryInitialization = () => {
    setFatalError(null);
    setLoading(true);
    setInitializeKey((current) => current + 1);
  };

  const completePasswordRecovery = async (password: string) => {
    await authService.updatePassword(password);
    setPasswordRecovery(false);
  };

  return { loading, session, fatalError, passwordRecovery, completePasswordRecovery, retryInitialization, enterDemo, completeOnboarding, logout };
}
