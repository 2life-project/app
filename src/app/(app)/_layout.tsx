import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/core/auth';
import { AssistantScreenOptions } from '@/features/assistant';
import { to } from '@/shared/nav';
import { fontFamily, radius, size, space, textVariant, theme } from '@/shared/theme';
import { GlassButton } from '@/shared/ui';

/**
 * Панели приложения — нативный шит системы, а не своя модалка. Граббер,
 * затемнение, перетаскивание, закрытие свайпом и высота по содержимому идут
 * от ОС; самодельный шит повторял бы это руками и разъезжался на каждой правке.
 */
const SHEET_SCREEN = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetCornerRadius: radius.xl,
  sheetGrabberVisible: true,
  gestureEnabled: true,
  headerShown: false,
  contentStyle: { backgroundColor: theme.color.background },
} as const;

/** Ассистент виден с любого раздела, но не поверх деталей и шитов. */
const TAB_ROOTS = new Set([to.home(), to.journal(), to.body(), to.records(), to.protocols()]);

/**
 * Приложение за сессией. Проверка стоит на слое, а не на каждом экране:
 * забытый экран иначе остался бы открытым, а его запросы всё равно вернули
 * бы 401 — то есть человек увидел бы пустую разметку вместо входа.
 */
export default function AppLayout() {
  const session = useSession();
  const pathname = usePathname();

  // Пока читаем ключ из Keychain и меняем его на сервере, не показываем ни
  // приложение, ни вход: вошедший увидел бы форму входа и решил, что его
  // выкинуло. Но и пустой экран показывать нельзя — он неотличим от зависшего.
  if (session.status === 'restoring') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.color.accent.text} />
      </View>
    );
  }
  if (session.status === 'anonymous') return <Redirect href={to.login()} />;

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.color.background },
          headerTintColor: theme.color.accent.text,
          headerTitleStyle: {
            color: theme.color.text,
            fontFamily: fontFamily.sans,
            ...textVariant.subtitle,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.color.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Способ показа экрана нужен навигатору до его появления, поэтому
            шиты объявлены здесь, а не внутри самого маршрута. */}
        <Stack.Screen name="assistant" options={AssistantScreenOptions} />

        {/* Панели. Каждая — свой адрес: так на неё можно вернуться, её видно
            в истории, и закрытие свайпом не требует своего состояния. */}
        <Stack.Screen name="event/[id]" options={SHEET_SCREEN} />
        <Stack.Screen name="measure/[subsystem]" options={SHEET_SCREEN} />
        <Stack.Screen name="threads" options={SHEET_SCREEN} />
      </Stack>

      {TAB_ROOTS.has(pathname) ? (
        <GlassButton
          size="xl"
          accessibilityLabel="Assistant"
          onPress={() => router.push(to.assistant())}
          style={styles.assistant}
          tint={theme.color.accent.surface}>
          <Feather name="message-circle" size={size.icon.lg} color={theme.color.accent.text} />
        </GlassButton>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.background,
  },
  assistant: { position: 'absolute', right: space.lg, bottom: 108 },
});
