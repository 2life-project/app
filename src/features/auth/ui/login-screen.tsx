import { useState } from 'react';

import { register, signIn } from '@/core/auth';
import { Button, Card, Field, Screen, Segmented, Stack, Text } from '@/shared/ui';

const MODES = [
  { value: 'in', label: 'Sign in' },
  { value: 'up', label: 'Create account' },
] as const;

type Mode = (typeof MODES)[number]['value'];

/**
 * Вход. Экрана в макете нет — формулировки рабочие и ждут вычитки.
 *
 * Ошибку сервера человеку не показываем: текст 4xx пишется для разработчика, и
 * пересказывать его в интерфейс запрещено. Причина уходит в лог, человек видит
 * одну понятную строку.
 */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = username.trim() !== '' && password !== '' && !busy;

  const submit = () => {
    setBusy(true);
    setFailed(false);
    const done =
      mode === 'in'
        ? signIn(username.trim(), password)
        : register(username.trim(), password, name.trim() || username.trim());

    done.catch(() => setFailed(true)).finally(() => setBusy(false));
  };

  return (
    <Screen>
      <Stack gap="lg">
        <Stack gap="xs">
          <Text variant="display">2Life</Text>
          <Text variant="bodySmall" tone="muted">
            your metrics, documents and protocols
          </Text>
        </Stack>

        <Segmented items={MODES} value={mode} onChange={setMode} />

        <Card>
          <Stack gap="md">
            <Field
              label="Login"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
            {mode === 'up' ? (
              <Field label="Name" value={name} onChangeText={setName} hint="how to address you" />
            ) : null}
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType={mode === 'in' ? 'password' : 'newPassword'}
            />
            <Button
              label={busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
              disabled={!ready}
              onPress={submit}
            />
            {failed ? (
              <Text tone="danger">
                {mode === 'in'
                  ? 'Wrong login or password.'
                  : 'The account was not created. Try another login.'}
              </Text>
            ) : null}
          </Stack>
        </Card>

        <Text variant="bodySmall" tone="muted">
          The session is kept in the phone keychain and renews itself. Signing out removes it.
        </Text>
      </Stack>
    </Screen>
  );
}
