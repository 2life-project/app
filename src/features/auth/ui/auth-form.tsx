import Feather from '@expo/vector-icons/Feather';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, type TextInput } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { size, theme } from '@/shared/theme';
import { Button, Field, Pressable, Screen, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';
import { useAuthForm } from '../model/use-auth-form';

/**
 * Общая часть входа и регистрации: заголовок, пара полей, главная кнопка и
 * место под то, чем экраны отличаются. Формы одинаковы, поэтому разметка одна:
 * расхождение между ними было бы багом, а не разнообразием.
 */
export function AuthForm({
  mode,
  title,
  subtitle,
  action,
  hint,
  footer,
}: {
  mode: 'in' | 'up';
  title: string;
  subtitle: string;
  action: string;
  /** Правила логина показываем до отправки, а не после отказа. */
  hint?: string;
  footer: ReactNode;
}) {
  // Ссылка живёт здесь, а не в хуке: правило React запрещает читать её
  // во время отрисовки, а вернуть фокус надо из обработчика отказа.
  const passwordRef = useRef<TextInput>(null);
  const form = useAuthForm(mode, () => passwordRef.current?.focus());

  // Клавиатура закрывала бы нижние кнопки: KeyboardAvoidingView под
  // edge-to-edge окно уже не сдвигает, поэтому высоту добираем распоркой,
  // которая следит за клавиатурой на UI-потоке.
  const keyboard = useAnimatedKeyboard();
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  return (
    <Screen keyboardDismissMode="interactive">
      <Stack gap="2xl" style={styles.fill}>
        <Stack gap="sm">
          <Text variant="display">{title}</Text>
          <Text>{subtitle}</Text>
        </Stack>

        <Stack gap="md">
          <Field
            label={AUTH.login}
            value={form.username}
            onChangeText={form.setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
          />
          <Field
            ref={passwordRef}
            label={AUTH.password}
            value={form.password}
            onChangeText={form.setPassword}
            secureTextEntry={!form.reveal}
            autoCapitalize="none"
            autoCorrect={false}
            // Разные роли поля: у существующего пароля система предлагает
            // сохранённый, у нового — сгенерировать надёжный.
            textContentType={mode === 'in' ? 'password' : 'newPassword'}
            returnKeyType="go"
            onSubmitEditing={() => void form.submit()}
            trailing={
              <Pressable
                accessibilityLabel={form.reveal ? AUTH.hidePassword : AUTH.showPassword}
                haptic={false}
                onPress={form.toggleReveal}>
                <Feather
                  name={form.reveal ? 'eye-off' : 'eye'}
                  size={size.icon.md}
                  color={theme.color.textMuted}
                />
              </Pressable>
            }
          />
          {hint ? (
            <Text variant="bodySmall" tone="muted">
              {hint}
            </Text>
          ) : null}
        </Stack>

        {/* Действия ниже середины: до низа экрана большой палец дотягивается,
            до середины крупного телефона — уже с перехватом. */}
        <Animated.View style={styles.fill} />

        <Stack gap="md">
          <Button
            label={action}
            loading={form.busy}
            disabled={!form.ready}
            onPress={() => void form.submit()}
          />
          {form.message ? (
            <Text tone="danger" style={styles.center}>
              {form.message}
            </Text>
          ) : null}
          {footer}
        </Stack>

        <Animated.View style={keyboardSpacer} />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
});
