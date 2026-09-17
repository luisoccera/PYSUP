import React, { useEffect, useRef } from 'react';

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pysup-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('turnstile_load_failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.pysupTurnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile_load_failed'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileChallenge({ siteKey, resetKey, onToken }: { siteKey: string; resetKey: number; onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    let widgetId = '';
    onToken(null);
    void loadTurnstile().then(() => {
      if (!active || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: 'dark',
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    }).catch(() => onToken(null));
    return () => {
      active = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, resetKey, siteKey]);

  return <div ref={container} aria-label="Verificación contra bots" style={{ minHeight: 66, width: '100%', display: 'flex', justifyContent: 'center' }} />;
}
