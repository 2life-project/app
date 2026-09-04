import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius as radiusToken, size } from '@/shared/theme';

import { Glass } from './glass';
import { Pressable } from './pressable';

/** Канонические размеры стеклянной кнопки. `md` совпадает с зоной нажатия. */
export const GLASS_BUTTON_SIZE = { sm: 36, md: size.tapTarget, lg: 52, xl: 64 } as const;

export type GlassButtonSize = keyof typeof GLASS_BUTTON_SIZE;
export type GlassButtonShape = 'circle' | 'pill' | 'rounded';

export type GlassButtonProps = {
  children: ReactNode;
  size?: GlassButtonSize | number;
  shape?: GlassButtonShape;
  onPress?: () => void;
  /** Оттенок стекла с альфой — например для разрушающего действия. */
  tint?: string;
  /** Внутри скролла и списков нативное стекло гаснет — там нужен blur. */
  frosted?: boolean;
  accessibilityLabel?: string;
  /** Стиль поверхности: например горизонтальные поля для формы `pill`. */
  surfaceStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

const resolve = (value: GlassButtonSize | number) =>
  typeof value === 'number' ? value : GLASS_BUTTON_SIZE[value];

/**
 * Единственная стеклянная кнопка: иконочная в шапке, плавающая, pill-действие.
 * Собирать заново связку «нажатие + стекло + размер + отклик» нельзя — иначе
 * они разъезжаются по экранам, а платформенные ветки размножаются копипастой.
 */
export function GlassButton({
  children,
  size: sizeProp = 'md',
  shape = 'circle',
  onPress,
  tint,
  frosted,
  accessibilityLabel,
  surfaceStyle,
  style,
}: GlassButtonProps) {
  const height = resolve(sizeProp);
  const corner = shape === 'rounded' ? radiusToken.lg : height / 2;

  const surface = (
    <Glass
      radius={corner}
      // Деформация кромки уместна там, где есть что нажимать.
      interactive={onPress !== undefined}
      tint={tint}
      frosted={frosted}
      style={[
        styles.surface,
        { height, minWidth: shape === 'circle' ? height : undefined, borderRadius: corner },
        surfaceStyle,
      ]}>
      {children}
    </Glass>
  );

  if (onPress === undefined) {
    return <>{surface}</>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}>
      {surface}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
