import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { register, signIn } from '@/core/auth';
import { HttpError } from '@/core/http/client';
import { RATE_LIMIT_SECONDS, useCooldown } from '@/shared/lib/cooldown';
import { size, space, theme } from '@/shared/theme';
import { Button, Field, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';

const TOO_MANY = 429;

/**
 * Один вход для новых и вернувшихся. Отдельного экрана регистрации нет:
 * человек вводит логин и пароль, а если такой пары ещё не существует —
 * заводит её тут же, не набирая всё заново.
 *
 * Текст ошибки от сервера в интерфейс не попадает: он написан для
 * разработчика. Причина уходит в лог, человек видит одну понятную строку.
 */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Вход не удался — предлагаем завести аккаунт с уже введённой парой. */
  const [offerRegister, setOfferRegister] = useState(false);
  const { secondsLeft, start: startCooldown } = useCooldown();

  // Клавиатура закрывала бы кнопки внизу: KeyboardAvoidingView под
  // edge-to-edge уже не сдвигает окно, поэтому высоту добираем распоркой,
  // которая следит за клавиатурой на UI-потоке.
  const keyboard = useAnimatedKeyboard();
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  const ready = username.trim() !== '' && password !== '' && !busy && secondsLeft === 0;

  const attempt = (create: boolean) => async () => {
    setBusy(true);
    setError(null);
    try {
      const login = username.trim();
      await (create ? register(login, password, login) : signIn(login, password));
    } catch (failure) {
      if (failure instanceof HttpError && failure.status === TOO_MANY) {
        // Слишком часто. Показываем отсчёт, а не ту же строку, что и при
        // неверном пароле: причина другая, и ждать надо, а не перенабирать.
        startCooldown(RATE_LIMIT_SECONDS);
      } else if (create) {
        setError(AUTH.registerFailed);
      } else {
        setError(AUTH.signInFailed);
        setOfferRegister(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}>
        <Stack gap="sm">
          <Text variant="display">{AUTH.title}</Text>
          <Text tone="muted">{AUTH.subtitle}</Text>
        </Stack>

        <Stack gap="md">
          <Field
            label={AUTH.login}
            value={username}
            onChangeText={(next) => {
              setUsername(next);
              setOfferRegister(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoFocus
          />
          <Field
            label={AUTH.password}
            value={password}
            onChangeText={(next) => {
              setPassword(next);
              setOfferRegister(false);
            }}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />
        </Stack>

        <Button
          label={AUTH.continue}
          disabled={!ready}
          loading={busy && !offerRegister}
          onPress={() => void attempt(false)()}
        />

        {secondsLeft > 0 || error ? (
          <Text tone="danger">{secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error}</Text>
        ) : null}

        {/* Регистрация появляется там же, где отказ, и с уже набранной парой:
            уводить на отдельный экран значит заставить набрать всё заново. */}
        {offerRegister ? (
          <Button
            label={AUTH.createAccount}
            variant="tonal"
            disabled={!ready}
            loading={busy}
            onPress={() => void attempt(true)()}
          />
        ) : null}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="bodySmall" tone="muted">
            {AUTH.or}
          </Text>
          <View style={styles.line} />
        </View>

        {/* Кнопки на месте, но нажать их нечем: обменять токен Apple или Google
            сервер пока не умеет. Живая кнопка, которая ничего не делает, хуже
            погашенной — по ней не понять, сломалось или так задумано. */}
        <Stack gap="sm">
          <Button
            label={AUTH.google}
            variant="tonal"
            tone="neutral"
            disabled
            icon={
              <FontAwesome name="google" size={size.icon.md} color={theme.color.textDisabled} />
            }
          />
          <Button
            label={AUTH.apple}
            variant="tonal"
            tone="neutral"
            disabled
            icon={<FontAwesome name="apple" size={size.icon.md} color={theme.color.textDisabled} />}
          />
          <Text variant="bodySmall" tone="muted" style={styles.center}>
            {AUTH.socialSoon}
          </Text>
        </Stack>

        <Text variant="bodySmall" tone="muted" style={styles.center}>
          {AUTH.disclaimer}
        </Text>

        <Animated.View style={keyboardSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { flexGrow: 1, padding: space.screen, gap: space.xl },
  center: { textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: size.border, backgroundColor: theme.color.border },
});
