import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { env } from '@/core/config/env';
import { HttpError } from '@/core/http/error';
import { logger } from '@/core/log/logger';

/**
 * Сессия: кто вошёл и чем подписаны запросы.
 *
 * Ключ доступа живёт пять минут, поэтому на диск не кладётся вовсе — на старте
 * он всё равно был бы просрочен. Хранится только ключ обновления, и хранится
 * в Keychain (iOS) и Keystore (Android): это доступ к медицинским данным, а
 * `AsyncStorage` на устройстве с root читается как обычный файл.
 *
 * Обновление одно на всех: при просрочке ключа сразу несколько экранов
 * получают 401, и без общего обещания каждый пошёл бы обновляться сам — сервер
 * увидел бы гонку из пяти обменов одного и того же ключа.
 */
const REFRESH_KEY = 'twolife.refresh';

export type SessionUser = {
  sub: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  subscriptionStatus?: string | null;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
  /** Секунды жизни ключа доступа — сервер называет его сам. */
  accessExpiresIn: number;
  user: SessionUser;
};

export type SessionState =
  /** Ещё не знаем: ключ обновления читается с диска при запуске. */
  { status: 'restoring' } | { status: 'anonymous' } | { status: 'signed'; user: SessionUser };

let access: string | null = null;
let refreshToken: string | null = null;
let state: SessionState = { status: 'restoring' };
let inflight: Promise<boolean> | null = null;

const listeners = new Set<() => void>();

function publish(next: SessionState) {
  state = next;
  for (const listener of listeners) listener();
}

export function authToken(): string | null {
  return access;
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Запуск приложения: есть ли на диске ключ, которым можно продолжить сессию. */
export async function restoreSession(): Promise<void> {
  try {
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch (failure) {
    logger.warn('Хранилище ключей недоступно', { failure });
  }

  if (refreshToken === null) {
    publish({ status: 'anonymous' });
    return;
  }

  publish((await refreshSession()) ? state : { status: 'anonymous' });
}

export async function signIn(username: string, password: string): Promise<void> {
  const tokens = await post<Tokens>('/api/v2/auth/login', { username, password });
  await keep(tokens);
}

export async function register(
  username: string,
  password: string,
  displayName: string,
): Promise<void> {
  const tokens = await post<Tokens>('/api/v2/auth/register', { username, password, displayName });
  await keep(tokens);
}

export async function signOut(): Promise<void> {
  const token = refreshToken;
  access = null;
  refreshToken = null;
  publish({ status: 'anonymous' });
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);

  // Сервер гасит ключ у себя — но выход на устройстве уже состоялся, и падать
  // из-за недоступной сети здесь нельзя.
  if (token) {
    await post('/api/v2/auth/logout', { refreshToken: token }).catch((failure: unknown) =>
      logger.warn('Сервер не подтвердил выход', { failure }),
    );
  }
}

/**
 * Обменять ключ обновления на новый ключ доступа. Возвращает, удалось ли:
 * вызывающий по этому решает, повторять ли запрос или показывать вход.
 */
export function refreshSession(): Promise<boolean> {
  return (inflight ??= exchange().finally(() => {
    inflight = null;
  }));
}

async function exchange(): Promise<boolean> {
  if (refreshToken === null) return false;
  try {
    await keep(await post<Tokens>('/api/v2/auth/refresh', { refreshToken }));
    return true;
  } catch (failure) {
    logger.warn('Сессию продлить не удалось', { failure });
    access = null;
    refreshToken = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
    publish({ status: 'anonymous' });
    return false;
  }
}

async function keep(tokens: Tokens): Promise<void> {
  access = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  publish({ status: 'signed', user: tokens.user });
}

/**
 * Свой запрос вместо общего клиента: тот при 401 идёт обновляться, а обновление
 * — это и есть этот вызов. Общий клиент вызывал бы сам себя без конца.
 */
async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Код нужен экрану: 429 он показывает отсчётом, а не той же строкой, что и
  // неверный пароль. Тело ошибки в интерфейс не идёт — только в лог.
  if (!response.ok) {
    const body: unknown = await response.text().catch(() => null);
    logger.warn('Вход не прошёл', { path, status: response.status, body });
    throw new HttpError(response.status, body);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}
