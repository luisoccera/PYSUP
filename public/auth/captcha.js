const params = new URLSearchParams(window.location.search);
const siteKey = params.get('siteKey') ?? '';
const state = params.get('state') ?? '';
const status = document.getElementById('status');
if (!/^[A-Za-z0-9_-]{5,120}$/.test(siteKey) || !/^[a-f0-9]{64}$/.test(state)) {
  status.textContent = 'Solicitud no válida. Vuelve a PYSUP e intenta de nuevo.';
} else {
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.onerror = () => { status.textContent = 'No se pudo cargar la verificación. Intenta de nuevo.'; };
  script.onload = () => {
    window.turnstile.render(document.getElementById('challenge'), {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token) => {
        const fragment = new URLSearchParams({ token, state });
        window.location.replace(`pysup://captcha/callback#${fragment}`);
      },
      'error-callback': () => { status.textContent = 'Verificación fallida. Intenta de nuevo.'; },
    });
  };
  document.head.appendChild(script);
}
