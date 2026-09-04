import { env } from '@/core/config/env';

/**
 * Логи продукта идут сюда, а не в `console` напрямую (правило запрещено линтером).
 * Отладочный шум глушится в релизе; ошибки останутся видимыми и станут точкой
 * подключения crash-репортера, когда он появится.
 */
type Payload = Record<string, unknown>;

function emit(level: 'debug' | 'info' | 'warn' | 'error', message: string, payload?: Payload) {
  if (!env.isDev && level !== 'error') return;
  // eslint-disable-next-line no-console
  console[level](message, payload ?? '');
}

export const logger = {
  debug: (message: string, payload?: Payload) => emit('debug', message, payload),
  info: (message: string, payload?: Payload) => emit('info', message, payload),
  warn: (message: string, payload?: Payload) => emit('warn', message, payload),
  error: (message: string, payload?: Payload) => emit('error', message, payload),
};
