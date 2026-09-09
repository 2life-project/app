import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { clearFatal, reportFatal, useFatal } from '@/core/log/fatal';
import { logTrail } from '@/core/log/logger';
import { space, theme } from '@/shared/theme';

import { Button } from './button';
import { Stack } from './stack';
import { Text } from './text';

/**
 * Экран вместо закрытия приложения.
 *
 * Показывает саму ошибку и последние события до неё. Текст стоит на экране
 * намеренно: сборщика крашей у приложения нет, отчёт TestFlight сообщения JS
 * не сохраняет, и снимок этого экрана — единственный способ узнать причину.
 *
 * Провайдеров здесь нет: expo-router оборачивает в границу сам корневой layout,
 * поэтому ни безопасных зон, ни навигации на этот момент ещё не существует.
 */
function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Stack gap="md" align="center">
          <Text variant="headline" style={styles.center}>
            Something broke
          </Text>
          <Text tone="muted" style={styles.center}>
            This screen could not be drawn. Your data is safe — try again.
          </Text>

          <Text variant="bodySmall" tone="danger" style={styles.center}>
            {error.name}: {error.message}
          </Text>

          {/* Строка в строку: тридцать записей должны поместиться на один
              снимок экрана, иначе начало следа до нас не доедет. */}
          <Stack gap="xs" style={styles.trail}>
            {logTrail().map((line, index) => (
              <Text key={`${index}-${line}`} variant="footnote" tone="muted" numberOfLines={1}>
                {line}
              </Text>
            ))}
          </Stack>

          <Button label="Try again" onPress={onRetry} />
        </Stack>
      </ScrollView>
    </View>
  );
}

/** Границу с этим именем expo-router находит сам и оборачивает в неё маршруты. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Запись из эффекта, а не из отрисовки: React рисует компонент столько раз,
  // сколько ему нужно, и одна ошибка попадала бы в след несколько раз.
  useEffect(() => {
    reportFatal(error);
  }, [error]);

  return (
    <ErrorScreen
      error={error}
      onRetry={() => {
        clearFatal();
        void retry();
      }}
    />
  );
}

/**
 * Второй перехват — для ошибок мимо отрисовки: worklet, таймер, колбэк
 * нативного модуля. Границу React они обходят, а приложение убивают так же.
 */
export function FatalGuard({ children }: { children: ReactNode }) {
  const fatal = useFatal();
  return fatal ? <ErrorScreen error={fatal} onRetry={clearFatal} /> : <>{children}</>;
}

/**
 * Отступ под статус-бар руками: провайдера безопасных зон на этом экране ещё
 * нет, а заголовок под часами не читается на снимке.
 */
const STATUS_BAR = 64;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: space.xl,
    paddingTop: STATUS_BAR,
    paddingBottom: space['3xl'],
  },
  center: { textAlign: 'center' },
  trail: { alignSelf: 'stretch' },
});
