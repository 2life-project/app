import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { restoreSession } from '@/core/auth';
// Импорт ради побочного эффекта: он регистрирует фоновую выгрузку с браслета.
// Система будит приложение без экранов, и обработчик должен существовать уже к
// этому моменту.
import '@/features/band';
import { theme } from '@/shared/theme';

/**
 * Корень приложения: провайдеры и восстановление сессии. Что показать —
 * решают слои `(app)` и `(auth)`, каждый по своей проверке.
 */
export default function RootLayout() {
  // Ключ обновления читается из Keychain один раз при запуске.
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
});
