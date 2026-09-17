import { useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const submitting = useRef(false);
  const captchaRequired = Platform.OS === 'web' && Boolean(env.turnstileSiteKey);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Ingresa un correo válido.';
    if (!password || password.length > 128) next.password = 'Ingresa tu contraseña.';
    if (mode === 'register') {
      if (password.length < 12) next.password = 'Usa al menos 12 caracteres.';
      else if (!/[a-záéíóúñ]/.test(password) || !/[A-ZÁÉÍÓÚÑ]/.test(password) || !/\d/.test(password)) next.password = 'Incluye mayúsculas, minúsculas y un número.';
      if (name.trim().length < 2) next.name = 'Escribe el nombre que verán tus amigos.';
      if (confirmPassword !== password) next.confirm = 'Las contraseñas no coinciden.';
      if (!acceptedTerms) next.accepted = 'Debes aceptar los términos para continuar.';
    }
    if (captchaRequired && !captchaToken) next.captcha = 'Completa la verificación contra bots.';
    return next;
  }, [acceptedTerms, captchaRequired, captchaToken, confirmPassword, email, mode, name, password]);

  const run = async (operation: () => Promise<void>, consumeCaptcha = false) => {
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
      if (consumeCaptcha) {
        setCaptchaToken(null);
        setCaptchaVersion((current) => current + 1);
      }
      submitting.current = false;
      setLoading(false);
    }
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    void run(async () => {
      if (!isSupabaseConfigured) throw new Error('Configura Supabase en .env antes de iniciar sesión.');
      if (mode === 'login') await authService.signIn(email, password, remember, captchaToken ?? undefined);
      else {
        const result = await authService.signUp(name, email, password, captchaToken ?? undefined);
        if (result.requiresEmailConfirmation) setInfo('Cuenta creada. Revisa tu correo para confirmar el acceso.');
      }
    }, captchaRequired);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitted(false);
    setError(null);
    setInfo(null);
    setCaptchaToken(null);
    setCaptchaVersion((current) => current + 1);
  };

  const sendRecovery = () => {
    void run(async () => {
      if (!isSupabaseConfigured) throw new Error('Configura Supabase antes de solicitar recuperación.');
      if (captchaRequired && !captchaToken) throw new Error('Completa la verificación contra bots.');
      await authService.sendPasswordRecovery(email, captchaToken ?? undefined);
      setRecoverySent(true);
    }, captchaRequired);
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
    captchaRequired,
    captchaSiteKey: env.turnstileSiteKey,
    captchaToken,
    captchaVersion,
    setCaptchaToken,
    openRecovery: () => { setRecoverySent(false); setError(null); setCaptchaToken(null); setCaptchaVersion((current) => current + 1); setRecoveryOpen(true); },
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
