import { env } from '@/core/config/env';
import { logger } from '@/core/log/logger';

const TIMEOUT_MS = 15_000;

/** Ответ пришёл, но не 2xx. Отличать от сетевого сбоя — разные экраны ошибок. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Транспорт и только транспорт: базовый адрес, JSON, таймаут, разбор ошибки.
 * Никакой продуктовой логики — она живёт в `features/<name>/api`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    signal: options.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    logger.error('Запрос не прошёл', { path, status: response.status });
    throw new HttpError(response.status, payload);
  }

  return payload as T;
}
