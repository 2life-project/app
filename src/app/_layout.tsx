import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { restoreSession } from '@/core/auth';
import { installFatalHandler } from '@/core/log/fatal';
// Импорт ради побочного эффекта: он регистрирует фоновую выгрузку с браслета.
// Система будит приложение без экранов, и обработчик должен существовать уже к
// этому моменту.
import '@/features/band';
import { theme } from '@/shared/theme';
import { FatalGuard } from '@/shared/ui';

/**
 * Граница ошибок всего приложения. Экспорт с этим именем expo-router узнаёт сам
 * и оборачивает в него дерево маршрутов.
 */
export { ErrorBoundary } from '@/shared/ui';

// До первого эффекта React ошибка тоже может прилететь, поэтому перехват
// ставится при загрузке модуля, а не при отрисовке.
installFatalHandler();

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
        <FatalGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </FatalGuard>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
});
