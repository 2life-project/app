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
/**
 * Поколение сессии. Растёт на каждом выходе и на каждой неудаче обмена.
 * Ответ обмена, начатого до выхода, приходит уже в другое поколение — и его
 * нельзя применять: иначе выход молча отменяется, а ключ возвращается в
 * Keychain, хотя человек только что вышел.
 */
let generation = 0;

const listeners = new Set<() => void>();

/**
 * Что стереть при выходе из аккаунта.
 *
 * Ключ доступа гасится здесь, а данные человека лежат слоями выше — профиль
 * тела, показания браслета, архив суток. Ядро о них не знает и знать не должно,
 * поэтому они приходят сюда сами: телефоном пользуются двое, и второй не должен
 * увидеть чужой рост, вес и пульс, а его браслет — считать по чужому телу.
 */
const onSignOutHandlers = new Set<() => void>();

export function onSignOut(handler: () => void): () => void {
  onSignOutHandlers.add(handler);
  return () => onSignOutHandlers.delete(handler);
}

function publish(next: SessionState) {
  // Смена состояния сессии переключает целый слой маршрутов, поэтому она
  // обязана быть в следе: падения приходятся ровно на такие переходы.
  logger.debug('Сессия', { status: next.status });
  state = next;
  for (const listener of listeners) listener();
}

export function authToken(): string | null {
  return access;
}

/**
 * Кто вошёл, вне React.
 *
 * Нужен там, где данные складываются в очередь на отправку: она принадлежит
 * account'у, а не телефону, и после смены человека старую очередь отправлять
 * от имени нового нельзя. Хук для этого не годится — очередь наполняется из
 * обработчиков и фоновой задачи, где React не работает.
 */
export function currentUser(): SessionUser | null {
  return state.status === 'signed' ? state.user : null;
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
    // Без Keychain человек будет входить заново каждый запуск, и без записи
    // в лог причина остаётся неизвестной: warn в релизе не пишется.
    logger.error('Хранилище ключей недоступно', { failure });
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
  generation += 1;
  access = null;
  refreshToken = null;

  // До объявления анонимности: иначе экраны успеют перерисоваться на чужих
  // данных, которые ещё лежат в памяти.
  for (const handler of onSignOutHandlers) {
    try {
      handler();
    } catch (failure) {
      logger.error('Личные данные не стёрлись при выходе', { failure });
    }
  }

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
 * Восстановление пароля: код на почту, проверка кода, новый пароль.
 *
 * Аккаунт называется логином либо почтой — сервер ждёт ровно одно из двух и
 * шлёт письмо только на адрес, уже сохранённый у найденного аккаунта. Ответ
 * на неизвестный аккаунт нейтральный: по нему нельзя узнать, есть ли такой.
 */
function resetAccount(account: string): Record<string, string> {
  const trimmed = account.trim();
  return trimmed.includes('@') ? { email: trimmed } : { username: trimmed };
}

export async function requestPasswordReset(account: string): Promise<void> {
  await post('/api/v2/auth/password-reset/request', resetAccount(account));
}

export async function validateResetCode(account: string, code: string): Promise<void> {
  await post('/api/v2/auth/password-reset/validate', { ...resetAccount(account), code });
}

/** Меняет пароль и гасит все сессии обновления: старые телефоны выйдут сами. */
export async function confirmPasswordReset(
  account: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await post('/api/v2/auth/password-reset/confirm', {
    ...resetAccount(account),
    code,
    newPassword,
  });
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
  const started = generation;
  try {
    const tokens = await post<Tokens>('/api/v2/auth/refresh', { refreshToken });
    // Пока ходили за ключом, человек мог выйти. Применить ответ значит вернуть
    // его в аккаунт и записать ключ обратно на диск.
    if (started !== generation) return false;
    await keep(tokens);
    return true;
  } catch (failure) {
    // Провал обмена — это конец сессии, а не отладочный шум: в релизе
    // logger.warn не пишется вовсе, и причина выхода потерялась бы.
    logger.error('Сессию продлить не удалось', { failure });
    if (started !== generation) return false;
    generation += 1;
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
  // неверный пароль. Тело ответа уезжает в саму ошибку — экран берёт из неё
  // машинный код, — но не в лог: след логов теперь показывается на экране
  // ошибки, а текст сервера в интерфейсе запрещён.
  if (!response.ok) {
    const body: unknown = await response.text().catch(() => null);
    logger.warn('Запрос авторизации не прошёл', { path, status: response.status });
    throw new HttpError(response.status, body);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}
