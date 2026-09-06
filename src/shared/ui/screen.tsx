import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, theme } from '@/shared/theme';

export type ScreenProps = ScrollViewProps & {
  /** Экран длиннее телефона — оборачиваем в скролл. */
  scroll?: boolean;
  /** Выключить боковые поля, если контент идёт во всю ширину. */
  padded?: boolean;
};

/**
 * Зазор между статус-баром и первой строкой. Полоса растворения кончается ровно
 * здесь: если она заходит на содержимое, то гасит не уезжающие строки, а
 * заголовок экрана, который никуда не уезжает.
 */
const CONTENT_TOP = space.sm;
const TRANSPARENT = `${theme.color.backdrop[0]}00`;

/**
 * Корень любого экрана: фон темы, безопасные зоны и единые поля.
 *
 * Скролл намеренно НЕ обёрнут в безопасную зону: тогда он обрезал бы контент по
 * её границе жёсткой линией. Вместо этого он занимает экран целиком, отступ
 * сверху уходит в содержимое, а строки, уезжающие под статус-бар,
 * растворяются в градиенте — так же, как внизу они уходят под панель.
 */
export function Screen({ scroll = true, padded = true, style, children, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inner = padded ? [styles.padded, style] : style;

  return (
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + CONTENT_TOP }, inner]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Контент уезжает ПОД панель навигации, а не упирается в неё: стекло
          // преломляет то, что под ним, и без этого выглядит плоским.
          contentInsetAdjustmentBehavior="never"
          {...rest}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingTop: insets.top }, inner]} {...rest}>
          {children}
        </View>
      )}

      {scroll ? (
        <LinearGradient
          pointerEvents="none"
          colors={[theme.color.backdrop[0], theme.color.backdrop[0], TRANSPARENT]}
          locations={[0, 0.55, 1]}
          style={[styles.topFade, { height: insets.top + CONTENT_TOP }]}
        />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: space['3xl'] },
  padded: { paddingHorizontal: space.screen },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
});
