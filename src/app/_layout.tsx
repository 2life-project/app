import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { fontFamily, textVariant, theme } from '@/shared/theme';

/** Корень приложения: провайдеры и оформление шапки. Экраны сюда не заезжают. */
export default function RootLayout() {
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
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
});
