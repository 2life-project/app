import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { Button, Field, Screen, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';
import { useResetForm } from '../model/use-reset-form';

/** Восстановление пароля: один экран, три шага подряд. */
export function ResetScreen() {
  const form = useResetForm();
  const copy = AUTH.reset;

  if (form.step === 'done') {
    return (
      <Screen>
        <Stack gap="2xl" style={styles.fill}>
          <Stack gap="sm">
            <Text variant="display">{copy.title}</Text>
            <Text>{copy.done}</Text>
          </Stack>
          <Button label={copy.back} onPress={() => router.replace(to.login())} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen keyboardDismissMode="interactive">
      <Stack gap="2xl" style={styles.fill}>
        <Stack gap="sm">
          <Text variant="display">{copy.title}</Text>
          <Text>{copy.subtitle[form.step]}</Text>
        </Stack>

        <Stack gap="md">
          {form.step === 'account' ? (
            <Field
              label={copy.account}
              value={form.account}
              onChangeText={form.setAccount}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="go"
              onSubmitEditing={() => void form.submit()}
              autoFocus
            />
          ) : null}

          {form.step === 'code' ? (
            <Field
              label={copy.code}
              value={form.code}
              onChangeText={form.setCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              returnKeyType="go"
              onSubmitEditing={() => void form.submit()}
              autoFocus
            />
          ) : null}

          {form.step === 'password' ? (
            <Field
              label={copy.newPassword}
              value={form.password}
              onChangeText={form.setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void form.submit()}
              autoFocus
            />
          ) : null}
        </Stack>

        <Stack gap="md">
          <Button
            label={
              form.step === 'account' ? copy.send : form.step === 'code' ? copy.check : copy.change
            }
            loading={form.busy}
            disabled={!form.ready}
            onPress={() => void form.submit()}
          />
          {form.message ? (
            <Text tone="danger" style={styles.center}>
              {form.message}
            </Text>
          ) : null}
          <Button label={copy.back} variant="plain" onPress={() => router.back()} />
        </Stack>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
});
