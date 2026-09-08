import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isUnauthorized, type Query } from '@/core/http/use-query';
import { space, theme } from '@/shared/theme';
import { Button, Card, Stack, Text } from '@/shared/ui';

/**
 * Четыре состояния экрана с сервера в одном месте. Разнесённые по виджетам,
 * они каждый раз пишутся заново и каждый раз по-разному: где-то спиннер,
 * где-то пустая карточка, где-то ничего — и экран врёт о том, что происходит.
 */
export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.color.accent.solid} />
    </View>
  );
}

/**
 * Текст ошибки сервера в интерфейс не попадает: наружу идёт своя формулировка,
 * ответ уходит в лог. Отсутствие доступа — отдельный случай: это не поломка, и
 * кнопка «Повторить» здесь ничего не изменит.
 */
export function Failed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const denied = isUnauthorized(error);

  return (
    <Card variant="sunken">
      <Stack gap="sm" align="flex-start">
        <Text variant="subtitle">{denied ? 'No access' : 'Could not load'}</Text>
        <Text tone="muted">
          {denied
            ? 'The session has no token yet — sign-in is not wired to this build.'
            : 'The server did not answer. Check the connection and try again.'}
        </Text>
        {denied ? null : <Button label="Try again" variant="tonal" onPress={onRetry} />}
      </Stack>
    </Card>
  );
}

/** Загрузка и ошибка одной строкой — экраны раздела вызывают это одинаково. */
export function StateCard({ query }: { query: Query<unknown> }) {
  return query.loading ? <Loading /> : <Failed error={query.error} onRetry={query.refresh} />;
}

const styles = StyleSheet.create({
  center: { paddingVertical: space['3xl'], alignItems: 'center' },
});
