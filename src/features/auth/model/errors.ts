import { errorCode } from '@/core/http/client';

import { AUTH } from './copy';

/**
 * Своя формулировка по машинному коду сервера. Текст ответа в интерфейс не
 * идёт — он написан для разработчика, — но код называет причину точно, и
 * показывать вместо неё общую заглушку значит заставить человека гадать.
 *
 * Незнакомый код превращается в общую строку: выдумывать смысл кода, которого
 * мы не видели, нельзя.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: AUTH.wrongPair,
  invalid_username: AUTH.badUsername,
  invalid_password: AUTH.badPassword,
  weak_password: AUTH.badPassword,
  username_taken: AUTH.loginTaken,
  user_exists: AUTH.loginTaken,
};

export function authMessage(failure: unknown, fallback: string): string {
  const code = errorCode(failure);
  return (code && MESSAGES[code]) ?? fallback;
}
