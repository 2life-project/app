import { useState } from 'react';

import { register, signIn } from '@/core/auth';
import { HttpError } from '@/core/http/error';
import { RATE_LIMIT_SECONDS, useCooldown } from '@/shared/lib/cooldown';

import { AUTH } from './copy';
import { authMessage } from './errors';

const TOO_MANY = 429;

/**
 * Логика обоих экранов входа: пара полей, отправка, разбор отказа.
 * Экран остаётся тонким — разметка и ничего больше.
 *
 * При отказе фокус возвращается в пароль, и экран не меняется. Это контракт
 * автозаполнения iOS: пока «Войти» не увело на защищённый экран, система не
 * считает попытку удачной и не предложит сохранить неверный пароль.
 */
export function useAuthForm(mode: 'in' | 'up', onFailure: () => void) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, start: startCooldown } = useCooldown();

  const login = username.trim();
  const ready = login !== '' && password !== '' && !busy && secondsLeft === 0;

  /** Правка поля стирает прошлый ответ сервера: он был про другую пару. */
  const edit = (set: (next: string) => void) => (next: string) => {
    set(next);
    setError(null);
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await (mode === 'up' ? register(login, password, login) : signIn(login, password));
    } catch (failure) {
      // Сортируем строго по коду ответа. Разбирать текст сообщения нельзя:
      // он меняется без предупреждения и написан не для человека.
      if (failure instanceof HttpError && failure.status === TOO_MANY) {
        startCooldown(RATE_LIMIT_SECONDS);
      } else {
        setError(authMessage(failure, mode === 'up' ? AUTH.registerFailed : AUTH.signInFailed));
      }
      onFailure();
    } finally {
      setBusy(false);
    }
  };

  return {
    username,
    password,
    reveal,
    busy,
    ready,
    message: secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error,
    setUsername: edit(setUsername),
    setPassword: edit(setPassword),
    toggleReveal: () => setReveal(!reveal),
    submit,
  };
}
