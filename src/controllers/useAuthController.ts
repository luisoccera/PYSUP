import { useMemo, useState } from 'react';
import { OnboardingResult, ProviderId } from '../models/types';

export type AuthMode = 'login' | 'register';

export function useAuthController(onAuthenticated: (name: string, skipOnboarding?: boolean) => void) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Ingresa un correo válido.';
    if (password.length < 8) next.password = 'Usa al menos 8 caracteres.';
    if (mode === 'register') {
      if (name.trim().length < 2) next.name = 'Escribe el nombre que verán tus amigos.';
      if (confirmPassword !== password) next.confirm = 'Las contraseñas no coinciden.';
      if (!acceptedTerms) next.accepted = 'Debes aceptar los términos para continuar.';
    }
    return next;
  }, [acceptedTerms, confirmPassword, email, mode, name, password]);

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length === 0) {
      onAuthenticated(mode === 'register' ? name.trim() : 'Luis');
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitted(false);
  };

  const openRecovery = () => {
    setRecoverySent(false);
    setRecoveryOpen(true);
  };

  return {
    mode,
    switchMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    remember,
    toggleRemember: () => setRemember((current) => !current),
    acceptedTerms,
    toggleAcceptedTerms: () => setAcceptedTerms((current) => !current),
    submitted,
    errors,
    submit,
    enterDemo: () => onAuthenticated('Luis', true),
    continueWithProvider: () => onAuthenticated('Luis'),
    recoveryOpen,
    recoverySent,
    openRecovery,
    closeRecovery: () => setRecoveryOpen(false),
    sendRecovery: () => setRecoverySent(true),
  };
}

export type AuthControllerState = ReturnType<typeof useAuthController>;

export function useOnboardingController(onComplete: (result: OnboardingResult) => void) {
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState('MX');
  const [connectedProviders, setConnectedProviders] = useState<ProviderId[]>([]);
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Ciencia ficción', 'Misterio']);
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null);

  const toggleProvider = (id: ProviderId) => {
    if (connectedProviders.includes(id)) {
      setConnectedProviders((current) => current.filter((item) => item !== id));
      return;
    }
    setConnectingProvider(id);
    setTimeout(() => {
      setConnectedProviders((current) => [...current, id]);
      setConnectingProvider(null);
    }, 550);
  };

  const toggleGenre = (genre: string) => {
    setPreferredGenres((current) => current.includes(genre)
      ? current.filter((item) => item !== genre)
      : [...current, genre]);
  };

  const next = () => {
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    onComplete({ country, connectedProviders, preferredGenres });
  };

  const skip = () => step < 2 ? setStep(2) : next();
  const previous = () => setStep((current) => Math.max(0, current - 1));
  const buttonDisabled = (step === 1 && connectedProviders.length === 0)
    || (step === 2 && preferredGenres.length < 2);

  return {
    step,
    country,
    setCountry,
    connectedProviders,
    preferredGenres,
    connectingProvider,
    toggleProvider,
    toggleGenre,
    next,
    skip,
    previous,
    buttonDisabled,
  };
}

export type OnboardingControllerState = ReturnType<typeof useOnboardingController>;
