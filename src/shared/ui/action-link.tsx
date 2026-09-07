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
  /**
   * Действие недоступно: ссылка гаснет и перестаёт нажиматься. Прятать её
   * нельзя — человек должен видеть, что тут есть действие, и почему оно пока
   * не работает, объясняет текст рядом.
   */
  disabled?: boolean;
};

/** Синяя ссылка-действие в шапке виджета: «Подробнее», «Журнал ›». */
export function ActionLink({ label, onPress, chevron = false, disabled = false }: ActionLinkProps) {
  return (
    <Pressable
      haptic={false}
      scaleTo={0.97}
      disabled={disabled}
      onPress={onPress}
      style={styles.row}>
      <Text variant="link" tone={disabled ? 'disabled' : 'accent'}>
        {label}
      </Text>
      {chevron ? (
        <Feather
          name="chevron-right"
          size={size.icon.sm}
          color={disabled ? theme.color.textDisabled : theme.color.accent.text}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
