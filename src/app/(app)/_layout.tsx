import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/core/auth';
import { AssistantScreenOptions } from '@/features/assistant';
import { to } from '@/shared/nav';
import { fontFamily, size, space, textVariant, theme } from '@/shared/theme';
import { GlassButton } from '@/shared/ui';

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

  // Пока читаем ключ из Keychain, не показываем ни приложение, ни вход:
  // вошедший увидел бы форму входа и решил, что его выкинуло.
  if (session.status === 'restoring') return <View style={styles.root} />;
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
      </Stack>

      {TAB_ROOTS.has(pathname) ? (
        <GlassButton
          size="xl"
          accessibilityLabel="Ассистент"
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
  assistant: { position: 'absolute', right: space.lg, bottom: 108 },
});
