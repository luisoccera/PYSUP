export class AppError extends Error {
  constructor(
    message: string,
    readonly code = 'unexpected_error',
    readonly recoverable = true,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export function toAppError(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    const message = error.message.toLowerCase().includes('network')
      ? 'No pudimos conectar con PYSUP. Revisa tu conexión e inténtalo de nuevo.'
      : error.message;
    return new AppError(message || fallback);
  }
  return new AppError(fallback);
}
