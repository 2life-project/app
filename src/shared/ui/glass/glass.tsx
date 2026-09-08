import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { memo, useCallback, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { size, theme } from '@/shared/theme';

import { supportsLiquidGlass } from './support';

export type GlassProps = {
  /** Скругление угла. На iOS 26 не навешивает overflow: кромка стекла обрежется. */
  radius?: number;
  /** iOS 26: деформация кромки под пальцем. На остальных платформах игнорируется. */
  interactive?: boolean;
  /** Оттенок стекла. Передавать цвет с альфой — он идёт как есть. */
  tint?: string;
  /**
   * Принудительный blur вместо нативного стекла. Нужен там, где `GlassView`
   * ненадёжен: в поповерах он мерцает на маунте и неверно меряется.
   */
  frosted?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const IS_ANDROID = Platform.OS === 'android';

/** Радиус размытия подложки. Маленький: текст за плашкой должен читаться. */
const BLUR_INTENSITY = 24;

/**
 * Стекло — один примитив на три платформенных вида, вызывающий не ветвится:
 *
 * - iOS 26+ — нативное Liquid Glass;
 * - iOS ≤ 18 — системный blur светлого тона плюс тонкая кромка;
 * - Android — тот же blur; без blur-таргета он рисует полупрозрачную подложку,
 *   и это осознанный предел: таргет требует отдельной инфраструктуры под
 *   каждой поверхностью.
 */
export const Glass = memo(function Glass({
  radius,
  interactive = false,
  tint,
  frosted = false,
  style,
  children,
}: GlassProps) {
  // Нативный эффект встаёт плоским, если применён до того, как у вью появился
  // размер, — гонка при монтировании внутри анимируемой панели. По первому
  // layout геометрия уже есть, и пересозданный эффект применяется надёжно.
  // Оттенок в ключе: смену тинта iOS тоже не подхватывает без пересоздания.
  const [laidOut, setLaidOut] = useState(false);
  const handleLayout = useCallback(() => setLaidOut(true), []);

  const radiusStyle = radius === undefined ? null : { borderRadius: radius };

  if (supportsLiquidGlass && !frosted) {
    return (
      <GlassView
        key={`${laidOut ? 'laid' : 'init'}:${tint ?? ''}`}
        onLayout={handleLayout}
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor={tint}
        isInteractive={interactive}
        style={[radiusStyle, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallback, radiusStyle, style]}>
      <BlurView
        tint="light"
        intensity={BLUR_INTENSITY}
        {...(IS_ANDROID ? { blurMethod: 'dimezisBlurViewSdk31Plus' as const } : {})}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.veil} />
      {tint ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      ) : null}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    position: 'relative',
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: size.border,
    borderColor: theme.color.border,
  },
  // Подложка поверх размытия: без неё светлый контент за стеклом просвечивает
  // до нечитаемости, а на Android без blur-таргета остаётся только она.
  veil: { position: 'absolute', inset: 0, backgroundColor: theme.color.glassVeil },
});
