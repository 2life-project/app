import { env } from '@/core/config/env';

/**
 * Шов авторизации. Все ручки контракта требуют `Authorization: Bearer`, но
 * входа в контракте пока нет — токен приходит извне и живёт здесь один на
 * приложение. Когда появится экран входа, он вызовет `setAuthToken`, и ни один
 * другой файл от этого не изменится.
 *
 * В памяти, а не на диске: хранилище токена — это решение об устройстве сессии
 * (срок жизни, обновление, выход), а его ещё нет. Класть медицинский токен в
 * незашифрованное хранилище «пока что» нельзя, поэтому пока не кладём никуда.
 */
let token: string | null = env.apiToken;

export function setAuthToken(next: string | null): void {
  token = next;
}

export function authToken(): string | null {
  return token;
}
