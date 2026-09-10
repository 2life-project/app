import { authToken, refreshSession } from '@/core/auth';
import { env } from '@/core/config/env';
import { logger } from '@/core/log/logger';

import { HttpError } from './error';

export { HttpError, errorCode } from './error';

const TIMEOUT_MS = 15_000;

/**
 * Необязательное поле объекта разрешено: `JSON.stringify` просто выбрасывает
 * `undefined`, а типы контракта описывают такие поля как опциональные —
 * запрещать их значило бы требовать `as` на каждом теле запроса.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

/**
 * Тело только JSON — и это ограничение намеренное. Файл через этот клиент
 * отправить нельзя: `JSON.stringify` превратил бы `FormData` в объект с путём
 * к файлу на телефоне, и сервер получил бы строку вместо документа. Загрузка
 * файлов идёт мимо — через `expo-file-system`, у которого есть прогресс и
 * продолжение в фоне.
 */
export type RequestOptions = Omit<RequestInit, 'body'> & { body?: JsonValue };

/**
 * Транспорт и только транспорт: базовый адрес, JSON, таймаут, разбор ошибки.
 * Никакой продуктовой логики — она живёт в `features/<name>/api`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status !== 401) return unwrap<T>(path, response);

  // Ключ доступа живёт минуты, поэтому 401 — это обычное «пора продлить», а не
  // «нет доступа». Продлеваем и повторяем ровно один раз: если и после обмена
  // сервер отвечает 401, дело не в сроке, и второй круг ничего не изменит.
  if (!(await refreshSession())) return unwrap<T>(path, response);
  return unwrap<T>(path, await send(path, options));
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { body, headers, signal, ...rest } = options;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const token = authToken();

  return fetch(`${env.apiUrl}${path}`, {
    ...rest,
    // Свой signal не отменяет таймаут, а складывается с ним: иначе экран,
    // который отменяет запрос при уходе, заодно выключал бы защиту от
    // залипшей сети, и спиннер крутился бы до перезапуска приложения.
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: {
      Accept: 'application/json',
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function unwrap<T>(path: string, response: Response): Promise<T> {
  const text = response.status === 204 ? '' : await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Успешный ответ, который не разобрался, — это captive-портал, прокси
      // или обрезанное тело. Вернуть null под типом T значит уронить экран
      // на первом же обращении к полю, поэтому ошибка поднимается здесь.
      if (response.ok) {
        logger.error('Ответ не разобрался как JSON', { path, status: response.status });
        throw new Error(`Ответ ${path} не является JSON`);
      }
      payload = text;
    }
  }

  if (!response.ok) {
    logger.error('Запрос не прошёл', { path, status: response.status });
    throw new HttpError(response.status, payload);
  }

  return payload as T;
}
