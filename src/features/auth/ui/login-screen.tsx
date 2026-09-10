import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { size, space, theme } from '@/shared/theme';
import { Button, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';

import { AuthForm } from './auth-form';

/** Вход. Регистрация живёт отдельным экраном: здесь одно действие. */
export function LoginScreen() {
  const [social, setSocial] = useState<string | null>(null);

  return (
    <AuthForm
      mode="in"
      title={AUTH.title}
      subtitle={AUTH.subtitle.in}
      action={AUTH.continue.in}
      footer={
        <Stack gap="lg">
          <Stack gap="sm">
            <Button
              label={AUTH.switchTo.in}
              variant="plain"
              onPress={() => router.push(to.register())}
            />
            <Button label={AUTH.forgot} variant="plain" onPress={() => router.push(to.reset())} />
          </Stack>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text variant="bodySmall" tone="muted">
              {AUTH.or}
            </Text>
            <View style={styles.line} />
          </View>

          {/* Кнопки живые, и нажатие честно говорит, что входа пока нет:
              сервер умеет обменять токен Apple и Google, но идентификаторы
              приложения у него не настроены (503), а на телефоне нет
              нативных SDK, которые этот токен выдают. Погашенная кнопка
              молчит, и по ней не понять, сломалось или так задумано. */}
          <Stack gap="sm">
            <Button
              label={AUTH.google}
              variant="tonal"
              tone="neutral"
              onPress={() => setSocial(AUTH.socialSoon)}
              icon={<FontAwesome name="google" size={size.icon.md} color={theme.color.text} />}
            />
            <Button
              label={AUTH.apple}
              variant="tonal"
              tone="neutral"
              onPress={() => setSocial(AUTH.socialSoon)}
              icon={<FontAwesome name="apple" size={size.icon.md} color={theme.color.text} />}
            />
            {social ? (
              <Text variant="bodySmall" tone="muted" style={styles.center}>
                {social}
              </Text>
            ) : null}
          </Stack>

          <Text variant="bodySmall" tone="muted" style={styles.center}>
            {AUTH.disclaimer}
          </Text>
        </Stack>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: size.border, backgroundColor: theme.color.border },
});
