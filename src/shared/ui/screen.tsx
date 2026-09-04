import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, screenPadding, spacing } from '@/shared/theme';

export type ScreenProps = ViewProps & {
  /** Экран длиннее телефона — оборачиваем в скролл. */
  scroll?: boolean;
  /** Выключить боковые поля, если экран рисует что-то во всю ширину. */
  padded?: boolean;
};

/**
 * Корень любого экрана: небо-градиент, безопасные зоны и единые поля.
 * Экраны не рисуют свой фон и не считают отступы от края сами.
 */
export function Screen({ scroll = true, padded = true, style, children, ...rest }: ScreenProps) {
  const inner = padded ? [styles.padded, style] : style;

  return (
    <LinearGradient colors={color.backdrop} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, inner]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...rest}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, inner]} {...rest}>
            {children}
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  padded: { paddingHorizontal: screenPadding },
});
