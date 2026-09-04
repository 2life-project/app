import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Третья строка под подзаголовком: «принято в 08:04», время приёма. */
  note?: string;
  /** Тон третьей строки: зелёный у выполненного, приглушённый у ожидающего. */
  noteTone?: 'muted' | 'success';
  /** Правая подпись: время, значение, статус. */
  trailing?: string;
  /** Вторая строка справа под `trailing`. */
  trailingCaption?: string;
  /** Слева: иконка, кружок отметки, аватар. */
  leading?: ReactNode;
  onPress?: () => void;
  /** Строка выполнена: содержимое приглушается, но остаётся читаемым. */
  done?: boolean;
};

/** Строка списка внутри виджета: приём добавки, событие дня, показатель. */
export function ListRow({
  title,
  subtitle,
  note,
  noteTone = 'muted',
  trailing,
  trailingCaption,
  leading,
  onPress,
  done = false,
}: ListRowProps) {
  const body = (
    <View style={styles.row}>
      {leading}
      <View style={styles.body}>
        <Text variant="body" tone={done ? 'muted' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
        ) : null}
        {note ? (
          <Text variant="bodySmall" tone={noteTone === 'success' ? 'success' : 'muted'}>
            {note}
          </Text>
        ) : null}
      </View>
      {trailing || trailingCaption ? (
        <View style={styles.trailing}>
          {trailing ? <Text variant="bodySmall">{trailing}</Text> : null}
          {trailingCaption ? (
            <Text variant="caption" tone="muted">
              {trailingCaption}
            </Text>
          ) : null}
        </View>
      ) : null}
      {onPress ? (
        <Feather name="chevron-right" size={size.icon.md} color={theme.color.textDisabled} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable haptic={false} scaleTo={0.99} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.tapTarget,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: theme.color.surfaceSunken,
  },
  body: { flex: 1, gap: space.xs },
  trailing: { alignItems: 'flex-end' },
});
