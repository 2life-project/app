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
 * Один экран для новых и вернувшихся: та же пара полей, два действия рядом.
 * Отдельного экрана регистрации нет — набирать логин и пароль дважды незачем.
 *
 * Оба действия видны сразу, а не появляются после отказа. Вход и регистрация
 * у нас две разные ручки: спрятав вторую за неудачей первой, мы бы оставили
 * нового человека без единого способа узнать, что аккаунт вообще заводится.
 *
 * Текст ошибки от сервера в интерфейс не попадает: он написан для
 * разработчика. Причина уходит в лог, человек видит одну понятную строку.
 */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Какое из двух действий сейчас в работе — крутится только его кнопка. */
  const [running, setRunning] = useState<'in' | 'up' | null>(null);
  const { secondsLeft, start: startCooldown } = useCooldown();

  // Клавиатура закрывала бы кнопки внизу: KeyboardAvoidingView под
  // edge-to-edge уже не сдвигает окно, поэтому высоту добираем распоркой,
  // которая следит за клавиатурой на UI-потоке.
  const keyboard = useAnimatedKeyboard();
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  const ready = username.trim() !== '' && password !== '' && running === null && secondsLeft === 0;

  /** Правка любого поля стирает прошлый ответ сервера: он был про другую пару. */
  const edit = (set: (next: string) => void) => (next: string) => {
    set(next);
    setError(null);
  };

  const attempt = (mode: 'in' | 'up') => async () => {
    setRunning(mode);
    setError(null);
    try {
      const login = username.trim();
      await (mode === 'up' ? register(login, password, login) : signIn(login, password));
    } catch (failure) {
      if (failure instanceof HttpError && failure.status === TOO_MANY) {
        // Слишком часто. Показываем отсчёт, а не ту же строку, что и при
        // неверном пароле: причина другая, и ждать надо, а не перенабирать.
        startCooldown(RATE_LIMIT_SECONDS);
      } else {
        setError(mode === 'up' ? AUTH.registerFailed : AUTH.signInFailed);
      }
    } finally {
      setRunning(null);
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
            onChangeText={edit(setUsername)}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoFocus
          />
          <Field
            label={AUTH.password}
            value={password}
            onChangeText={edit(setPassword)}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />
        </Stack>

        {/* Оба действия видны сразу. Прятать регистрацию за неудачным входом
            нельзя: у нас две разные ручки, и новому человеку негде узнать,
            что аккаунт вообще можно завести. */}
        <Stack gap="sm">
          <Button
            label={AUTH.continue}
            disabled={!ready}
            loading={running === 'in'}
            onPress={() => void attempt('in')()}
          />
          <Button
            label={AUTH.createAccount}
            variant="plain"
            disabled={!ready}
            loading={running === 'up'}
            onPress={() => void attempt('up')()}
          />
        </Stack>

        {secondsLeft > 0 || error ? (
          <Text tone="danger">{secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error}</Text>
        ) : null}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="bodySmall" tone="muted">
            {AUTH.or}
          </Text>
          <View style={styles.line} />
        </View>

        {/* Кнопки живые, но обменять токен Apple или Google сервер пока не
            умеет — нажатие честно об этом говорит. Погашенная кнопка молчит, и
            по ней не понять, сломалось или так задумано. */}
        <Stack gap="sm">
          <Button
            label={AUTH.google}
            variant="tonal"
            tone="neutral"
            onPress={() => setError(AUTH.socialSoon)}
            icon={<FontAwesome name="google" size={size.icon.md} color={theme.color.text} />}
          />
          <Button
            label={AUTH.apple}
            variant="tonal"
            tone="neutral"
            onPress={() => setError(AUTH.socialSoon)}
            icon={<FontAwesome name="apple" size={size.icon.md} color={theme.color.text} />}
          />
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
