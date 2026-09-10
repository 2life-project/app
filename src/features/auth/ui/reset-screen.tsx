import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { Button, Field, KeyboardSpacer, Screen, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';
import { useResetForm } from '../model/use-reset-form';

/** Подпись главной кнопки на каждом шаге. */
const ACTION = {
  account: AUTH.reset.send,
  code: AUTH.reset.check,
  password: AUTH.reset.change,
  done: AUTH.reset.back,
} as const;

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
            <>
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
              <Button
                label={copy.resend}
                variant="plain"
                disabled={!form.canResend}
                onPress={() => void form.resend()}
              />
            </>
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

        {/* Действия ниже середины: до низа экрана большой палец дотягивается. */}
        <Stack style={styles.fill} />

        <Stack gap="md">
          <Button
            label={ACTION[form.step]}
            loading={form.busy}
            disabled={!form.ready}
            onPress={() => void form.submit()}
          />
          {form.message ? (
            <Text tone="danger" style={styles.center}>
              {form.message}
            </Text>
          ) : null}
          {/* С первого шага — на вход; с остальных — на шаг назад, введённое
              остаётся: уйти с экрана значило бы набирать почту заново. */}
          <Button
            label={form.step === 'account' ? copy.back : copy.stepBack}
            variant="plain"
            onPress={form.step === 'account' ? () => router.back() : form.back}
          />
        </Stack>

        <KeyboardSpacer />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
});
