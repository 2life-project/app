import { useState } from 'react';

import { confirmPasswordReset, requestPasswordReset, validateResetCode } from '@/core/auth';
import { HttpError } from '@/core/http/error';
import { RATE_LIMIT_SECONDS, useCooldown } from '@/shared/lib/cooldown';

import { AUTH } from './copy';
import { authMessage } from './errors';

const TOO_MANY = 429;

/** Шаг восстановления: кому слать код → какой пришёл → какой пароль ставить. */
export type ResetStep = 'account' | 'code' | 'password' | 'done';

const CODE = /^\d{6}$/;
const MIN_PASSWORD = 8;

/**
 * Логика восстановления пароля. Три запроса подряд, и каждый шаг проверяет
 * своё поле до отправки: сервер отверг бы его, а человек увидел бы общий отказ
 * вместо подсказки, что не так.
 */
export function useResetForm() {
  const [step, setStep] = useState<ResetStep>('account');
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, start: startCooldown } = useCooldown();

  const ready =
    !busy &&
    secondsLeft === 0 &&
    (step === 'account'
      ? account.trim() !== ''
      : step === 'code'
        ? CODE.test(code.trim())
        : step === 'password'
          ? password.trim().length >= MIN_PASSWORD
          : false);

  const edit = (set: (next: string) => void) => (next: string) => {
    set(next);
    setError(null);
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      if (step === 'account') {
        await requestPasswordReset(account);
        setStep('code');
      } else if (step === 'code') {
        await validateResetCode(account, code.trim());
        setStep('password');
      } else if (step === 'password') {
        await confirmPasswordReset(account, code.trim(), password);
        setStep('done');
      }
    } catch (failure) {
      // Сортируем строго по коду ответа: текст сервера написан не для человека.
      if (failure instanceof HttpError && failure.status === TOO_MANY) {
        startCooldown(RATE_LIMIT_SECONDS);
      } else {
        setError(authMessage(failure, AUTH.reset.failed));
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    step,
    account,
    code,
    password,
    busy,
    ready,
    message: secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error,
    setAccount: edit(setAccount),
    setCode: edit(setCode),
    setPassword: edit(setPassword),
    submit,
  };
}
