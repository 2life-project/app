import Feather from '@expo/vector-icons/Feather';
import { StyleSheet } from 'react-native';

import { size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type ActionLinkProps = {
  label: string;
  onPress: () => void;
  /** Шеврон показывает, что переход уводит на другой экран. */
  chevron?: boolean;
};

/** Синяя ссылка-действие в шапке виджета: «Подробнее», «Журнал ›». */
export function ActionLink({ label, onPress, chevron = false }: ActionLinkProps) {
  return (
    <Pressable haptic={false} scaleTo={0.97} onPress={onPress} style={styles.row}>
      <Text variant="link" tone="accent">
        {label}
      </Text>
      {chevron ? (
        <Feather name="chevron-right" size={size.icon.sm} color={theme.color.accent.text} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
