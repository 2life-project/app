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

  const readyByStep: Record<ResetStep, boolean> = {
    account: account.trim() !== '',
    code: CODE.test(code.trim()),
    password: password.trim().length >= MIN_PASSWORD,
    done: false,
  };
  const ready = !busy && secondsLeft === 0 && readyByStep[step];

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

  /**
   * Шаг назад — к предыдущему полю, не с экрана: введённое остаётся, и код,
   * который так и не пришёл, можно запросить заново, не набирая почту снова.
   */
  const back = () => {
    setError(null);
    setStep(step === 'password' ? 'code' : 'account');
  };

  /** Код заново — с того же шага: письмо могло не дойти или код истёк. */
  const resend = async () => {
    if (busy || secondsLeft > 0) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(account);
      setCode('');
    } catch (failure) {
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
    canResend: !busy && secondsLeft === 0,
    message: secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error,
    setAccount: edit(setAccount),
    setCode: edit(setCode),
    setPassword: edit(setPassword),
    submit,
    back,
    resend,
  };
}
