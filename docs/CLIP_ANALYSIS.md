# Análisis de clips

Flujo técnico:

1. El cliente valida HTTPS/dominio o MIME/tamaño/duración conocida.
2. Los archivos se suben a `clip-uploads`, bucket privado, mediante URL firmada.
3. Se crea `clip_analysis_jobs` con consentimiento y metadatos mínimos.
4. La Edge Function autentica al usuario, aplica rate limit y valida de nuevo el origen.
5. Un worker protegido procesa fotogramas, audio, OCR y transcripción.
6. Sólo candidatos con confianza y evidencia reales se insertan en `clip_candidates`.
7. El cliente escucha estados por Realtime, consulta disponibilidad regional y pide confirmación.
8. El original se elimina al finalizar; `purge-expired-clips` limpia fallos y cargas abandonadas.

El worker y cualquier proveedor de huellas audiovisuales deben contar con bases legales y licencias suficientes. La función devuelve `503 clip_worker_not_configured` hasta que existan credenciales reales.
