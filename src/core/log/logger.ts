import { env } from '@/core/config/env';

/**
 * Логи продукта идут сюда, а не в `console` напрямую (правило запрещено линтером).
 * Отладочный шум глушится в релизе; ошибки останутся видимыми и станут точкой
 * подключения crash-репортера, когда он появится.
 *
 * Записывается при этом всё и всегда — в кольцевой след. В релизе `console` молчит,
 * а сборщика крашей у приложения нет: без следа падение на чужом телефоне
 * остаётся отчётом без единой строки о том, что происходило до него.
 */
type Payload = Record<string, unknown>;

/** Больше тридцати строк не влезет в снимок экрана, а меньше — теряет причину. */
const TRAIL_LIMIT = 30;

const trail: string[] = [];
const startedAt = Date.now();

/** Полезная нагрузка одной строкой. Сама запись падать не имеет права. */
function short(payload: Payload): string {
  try {
    const text = JSON.stringify(payload, (_key, value: unknown) =>
      value instanceof Error ? `${value.name}: ${value.message}` : value,
    );
    return text === undefined ? '' : text.slice(0, 120);
  } catch {
    return Object.keys(payload).join(',');
  }
}

function emit(level: 'debug' | 'info' | 'warn' | 'error', message: string, payload?: Payload) {
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  trail.push(`${seconds}s ${level[0]} ${message}${payload ? ` ${short(payload)}` : ''}`);
  if (trail.length > TRAIL_LIMIT) trail.shift();

  if (!env.isDev && level !== 'error') return;
  // eslint-disable-next-line no-console
  console[level](message, payload ?? '');
}

/** Последние события с запуска. Их показывает экран ошибки — читать их некому больше. */
export function logTrail(): readonly string[] {
  return trail;
}

export const logger = {
  debug: (message: string, payload?: Payload) => emit('debug', message, payload),
  info: (message: string, payload?: Payload) => emit('info', message, payload),
  warn: (message: string, payload?: Payload) => emit('warn', message, payload),
  error: (message: string, payload?: Payload) => emit('error', message, payload),
};
