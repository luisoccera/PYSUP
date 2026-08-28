import { useMemo, useRef, useState } from 'react';
import { env } from '../config/env';
import type { OnboardingResult, ProviderId } from '../models/types';
import { authService } from '../services/auth/authService';
import { isSupabaseConfigured } from '../services/supabase/client';
import { toAppError } from '../utils/errors';

export type AuthMode = 'login' | 'register';

export function useAuthController(onDemo: () => Promise<void>) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const submitting = useRef(false);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Ingresa un correo válido.';
    if (password.length < 8) next.password = 'Usa al menos 8 caracteres.';
    if (mode === 'register') {
      if (name.trim().length < 2) next.name = 'Escribe el nombre que verán tus amigos.';
      if (confirmPassword !== password) next.confirm = 'Las contraseñas no coinciden.';
      if (!acceptedTerms) next.accepted = 'Debes aceptar los términos para continuar.';
    }
    return next;
  }, [acceptedTerms, confirmPassword, email, mode, name, password]);

  const run = async (operation: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await operation();
    } catch (caught) {
      setError(toAppError(caught).message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    void run(async () => {
      if (!isSupabaseConfigured) throw new Error('Configura Supabase en .env antes de iniciar sesión.');
      if (mode === 'login') await authService.signIn(email, password, remember);
      else {
        const result = await authService.signUp(name, email, password);
        if (result.requiresEmailConfirmation) setInfo('Cuenta creada. Revisa tu correo para confirmar el acceso.');
      }
    });
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitted(false);
    setError(null);
    setInfo(null);
  };

  const sendRecovery = () => {
    void run(async () => {
      if (!isSupabaseConfigured) throw new Error('Configura Supabase antes de solicitar recuperación.');
      await authService.sendPasswordRecovery(email);
      setRecoverySent(true);
    });
  };

  return {
    mode, switchMode, name, setName, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, remember, toggleRemember: () => setRemember((current) => !current),
    acceptedTerms, toggleAcceptedTerms: () => setAcceptedTerms((current) => !current),
    submitted, errors, loading, error, info, submit,
    canEnterDemo: env.demoMode,
    enterDemo: () => { void run(onDemo); },
    continueWithProvider: (provider: 'google' | 'apple') => { void run(async () => {
      if (!isSupabaseConfigured) throw new Error('Configura Supabase y el proveedor OAuth antes de continuar.');
      await authService.signInWithProvider(provider);
    }); },
    recoveryOpen,
    recoverySent,
    openRecovery: () => { setRecoverySent(false); setError(null); setRecoveryOpen(true); },
    closeRecovery: () => setRecoveryOpen(false),
    sendRecovery,
  };
}

export type AuthControllerState = ReturnType<typeof useAuthController>;

export function useOnboardingController(onComplete: (result: OnboardingResult) => Promise<void>) {
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState('MX');
  const [connectedProviders, setConnectedProviders] = useState<ProviderId[]>([]);
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Ciencia ficción', 'Misterio']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProvider = (id: ProviderId) => setConnectedProviders((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);
  const toggleGenre = (genre: string) => setPreferredGenres((current) => current.includes(genre)
    ? current.filter((item) => item !== genre)
    : [...current, genre]);

  const next = () => {
    if (step < 2) return setStep((current) => current + 1);
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    void onComplete({ country, connectedProviders, preferredGenres })
      .catch((caught) => setError(toAppError(caught).message))
      .finally(() => setSubmitting(false));
  };

  const skip = () => step < 2 ? setStep(2) : next();
  return {
    step, country, setCountry, connectedProviders, preferredGenres, connectingProvider: null,
    toggleProvider, toggleGenre, next, skip,
    previous: () => setStep((current) => Math.max(0, current - 1)),
    buttonDisabled: submitting || (step === 2 && preferredGenres.length < 2),
    submitting, error,
  };
}

export type OnboardingControllerState = ReturnType<typeof useOnboardingController>;
