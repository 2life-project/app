import Feather from '@expo/vector-icons/Feather';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantScreenOptions } from '@/features/assistant';
import { to } from '@/shared/nav';
import { fontFamily, size, space, textVariant, theme } from '@/shared/theme';
import { GlassButton } from '@/shared/ui';

/** Ассистент виден с любого раздела, но не поверх деталей и шитов. */
const TAB_ROOTS = new Set([to.home(), to.journal(), to.body(), to.records(), to.protocols()]);

/** Корень приложения: провайдеры, оформление шапки и сквозной ассистент. */
export default function RootLayout() {
  const pathname = usePathname();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  assistant: { position: 'absolute', right: space.lg, bottom: 108 },
});
