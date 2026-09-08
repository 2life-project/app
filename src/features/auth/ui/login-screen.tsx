import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { register, signIn } from '@/core/auth';
import { HttpError } from '@/core/http/error';
import { RATE_LIMIT_SECONDS, useCooldown } from '@/shared/lib/cooldown';
import { size, space, theme } from '@/shared/theme';
import { Button, Field, Pressable, Screen, Stack, Text } from '@/shared/ui';

import { AUTH } from '../model/copy';
import { authMessage } from '../model/errors';

const TOO_MANY = 429;

type Mode = 'in' | 'up';

/**
 * Вход и регистрация одним экраном: та же пара полей, два режима.
 *
 * Иерархия здесь важнее украшений. На экране ровно одно главное действие —
 * оно же меняется вместе с режимом; ссылка под ним уводит в другой режим,
 * источники входа отделены чертой. Когда все действия выглядят одинаково,
 * взгляду не за что зацепиться, и экран читается как неработающий.
 *
 * Ссылка переключает режим, а не отправляет форму. Пока она была вторым
 * отправляющим действием, нажатие на пустой форме давало ту же ошибку, что
 * уже висела на экране, — то есть выглядело как «кнопка не работает».
 *
 * Главная кнопка не гаснет на пустой форме. Погасшая кнопка молчит о причине,
 * а нажатие даёт назвать её словами — и на первом же взгляде на экране есть
 * акцентный цвет, а не сплошной серый.
 *
 * Текст ошибки от сервера в интерфейс не идёт: он написан для разработчика.
 * Формулировку выбираем по машинному коду ответа, причина уходит в лог.
 */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { secondsLeft, start: startCooldown } = useCooldown();

  // Клавиатура закрывала бы нижние кнопки: KeyboardAvoidingView под
  // edge-to-edge окно уже не сдвигает, поэтому высоту добираем распоркой,
  // которая следит за клавиатурой на UI-потоке.
  const keyboard = useAnimatedKeyboard();
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  const login = username.trim();

  /** Правка поля стирает прошлый ответ сервера: он был про другую пару. */
  const edit = (set: (next: string) => void) => (next: string) => {
    set(next);
    setError(null);
  };

  const submit = async () => {
    if (login === '' || password === '') {
      setError(AUTH.needBoth[mode]);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await (mode === 'up' ? register(login, password, login) : signIn(login, password));
    } catch (failure) {
      if (failure instanceof HttpError && failure.status === TOO_MANY) {
        // Слишком часто. Отсчёт, а не та же строка, что при неверном пароле:
        // причина другая, и ждать надо, а не перенабирать.
        startCooldown(RATE_LIMIT_SECONDS);
      } else {
        setError(authMessage(failure, mode === 'up' ? AUTH.registerFailed : AUTH.signInFailed));
      }
    } finally {
      setBusy(false);
    }
  };

  const waiting = busy || secondsLeft > 0;

  return (
    <Screen keyboardDismissMode="interactive">
      <Stack gap="2xl" style={styles.fill}>
        <Stack gap="sm">
          <Text variant="display">{AUTH.title}</Text>
          <Text>{AUTH.subtitle[mode]}</Text>
        </Stack>

        {/* Поля рядом друг с другом, действия — поодаль: близость и есть то,
            что связывает элементы в группу и отделяет группы друг от друга. */}
        <Stack gap="md">
          <Field
            label={AUTH.login}
            value={username}
            onChangeText={edit(setUsername)}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
          />
          <Field
            label={AUTH.password}
            value={password}
            onChangeText={edit(setPassword)}
            secureTextEntry={!reveal}
            autoCapitalize="none"
            autoCorrect={false}
            // Разные роли поля: у существующего пароля система предлагает
            // сохранённый, у нового — сгенерировать надёжный.
            textContentType={mode === 'in' ? 'password' : 'newPassword'}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            // Пароль набирают вслепую, и опечатку видно только по отказу.
            trailing={
              <Pressable
                accessibilityLabel={reveal ? AUTH.hidePassword : AUTH.showPassword}
                haptic={false}
                onPress={() => setReveal(!reveal)}>
                <Feather
                  name={reveal ? 'eye-off' : 'eye'}
                  size={size.icon.md}
                  color={theme.color.textMuted}
                />
              </Pressable>
            }
          />
        </Stack>

        {/* Действия ниже середины: до низа экрана большой палец дотягивается,
            до его середины на крупном телефоне — уже с перехватом. */}
        <View style={styles.fill} />

        <Stack gap="md">
          <Button
            label={AUTH.continue[mode]}
            loading={busy}
            disabled={waiting}
            onPress={() => void submit()}
          />

          {secondsLeft > 0 || error ? (
            <Text tone="danger" style={styles.center}>
              {secondsLeft > 0 ? AUTH.tooMany(secondsLeft) : error}
            </Text>
          ) : null}

          {/* Переключение режима, а не второе отправляющее действие: нажатие
              обязано менять экран, иначе оно неотличимо от несработавшего. */}
          <Button
            label={AUTH.switchTo[mode]}
            variant="plain"
            disabled={busy}
            onPress={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError(null);
            }}
          />
        </Stack>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="bodySmall" tone="muted">
            {AUTH.or}
          </Text>
          <View style={styles.line} />
        </View>

        {/* Кнопки живые: обменять токен Apple или Google сервер пока не умеет,
            и нажатие честно об этом говорит. Погашенная кнопка молчит, и по
            ней не понять, сломалось или так задумано. */}
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
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: size.border, backgroundColor: theme.color.border },
});
