import { Switch } from 'react-native';

import { theme } from '@/shared/theme';

export type ToggleProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel: string;
};

/**
 * Переключатель настройки. Берём системный: он несёт жест, доступность и
 * анимацию платформы, а своя реализация повторяла бы это ради одного цвета.
 */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: theme.color.surfaceSunken, true: theme.color.success.solid }}
      // Тень у бегунка системная — свой цвет ставим только включённому треку.
      ios_backgroundColor={theme.color.surfaceSunken}
    />
  );
}
