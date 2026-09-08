import { router } from 'expo-router';

import { Button } from '@/shared/ui';

import { AUTH } from '../model/copy';

import { AuthForm } from './auth-form';

/**
 * Регистрация отдельным экраном. Правила логина стоят под полями до отправки:
 * сервер их проверяет, но узнавать о них из отказа — значит гадать, что
 * именно не подошло.
 */
export function RegisterScreen() {
  return (
    <AuthForm
      mode="up"
      title={AUTH.registerTitle}
      subtitle={AUTH.subtitle.up}
      action={AUTH.continue.up}
      hint={AUTH.loginRule}
      footer={<Button label={AUTH.switchTo.up} variant="plain" onPress={() => router.back()} />}
    />
  );
}
