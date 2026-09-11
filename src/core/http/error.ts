import { logger } from '@/core/log/logger';

/**
 * Ответ пришёл, но не 2xx. Отличать от сетевого сбоя — разные экраны ошибок.
 *
 * Живёт отдельно от клиента намеренно: сессия тоже возбуждает эту ошибку, а
 * клиент за токеном ходит в сессию. Пока класс лежал в клиенте, импорты
 * замыкались в кольцо, и один из них приходил пустым.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

/**
 * Машинный код ошибки из тела ответа. Именно код, а не текст: текст сервера
 * написан для разработчика и в интерфейс не идёт, а по коду экран выбирает
 * собственную формулировку.
 */
export function errorCode(failure: unknown): string | null {
  if (!(failure instanceof HttpError)) return null;
  const body = typeof failure.body === 'string' ? safeParse(failure.body) : failure.body;
  if (typeof body !== 'object' || body === null) return null;
  const code = (body as { error?: unknown }).error;
  return typeof code === 'string' ? code : null;
}

/**
 * Записать отказ запроса в лог тем уровнем, каким его увидят.
 *
 * Ответ сервера клиент уже записал предупреждением при разборе; повторять его
 * — шум. А вот отсутствие ответа — сеть, таймаут, хранилище — нигде больше
 * не записано, и в релизе виден только `error`.
 */
export function reportFailure(message: string, failure: unknown): void {
  if (failure instanceof HttpError) logger.warn(message, { status: failure.status });
  else logger.error(message, { reason: String(failure) });
}

/**
 * Подробности отказа проверки: сервер называет поле и причину. Только для
 * лога — в интерфейс уходит своя формулировка по коду.
 */
export function errorDetails(failure: unknown): unknown {
  if (!(failure instanceof HttpError)) return undefined;
  const body = typeof failure.body === 'string' ? safeParse(failure.body) : failure.body;
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as { details?: unknown }).details;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
