import { StyleSheet, Switch, View } from 'react-native';

import { size, theme } from '@/shared/theme';

import { Pressable } from './pressable';

export type ToggleProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel: string;
};

/**
 * Переключатель настройки. Вид, анимация и жест перетаскивания — системные:
 * своя реализация повторяла бы их ради одного цвета.
 *
 * А вот нажатие обрабатываем сами. Системный переключатель забирает касание
 * себе, но по короткому тапу его не отрабатывает: перетаскивание включает,
 * а нажатие — нет. Поэтому касания до него не доходят вовсе, их принимает
 * обёртка, а сам переключатель остаётся индикатором.
 *
 * Зона нажатия шире самого переключателя: 51pt у края экрана — цель, мимо
 * которой промахиваются, и промах выглядит как «не работает».
 */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      scaleTo={1}
      hitSlop={HIT_SLOP}
      disabled={onValueChange === undefined}
      onPress={() => onValueChange?.(!value)}>
      <View pointerEvents="none" style={styles.indicator}>
        <Switch
          value={value}
          trackColor={{ false: theme.color.surfaceSunken, true: theme.color.success.solid }}
          // Тень у бегунка системная — свой цвет ставим только включённому треку.
          ios_backgroundColor={theme.color.surfaceSunken}
        />
      </View>
    </Pressable>
  );
}

const SWITCH_WIDTH = 51;
const HIT_SLOP = Math.round((size.tapTarget - SWITCH_WIDTH / 2) / 2);

const styles = StyleSheet.create({
  indicator: { alignItems: 'center', justifyContent: 'center' },
});
