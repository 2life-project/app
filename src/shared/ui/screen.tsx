import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, theme } from '@/shared/theme';

export type ScreenProps = ViewProps & {
  /** Экран длиннее телефона — оборачиваем в скролл. */
  scroll?: boolean;
  /** Выключить боковые поля, если контент идёт во всю ширину. */
  padded?: boolean;
};

/**
 * Корень любого экрана: фон темы, безопасные зоны и единые поля.
 * Экраны не рисуют свой фон и не считают отступы от края сами.
 */
export function Screen({ scroll = true, padded = true, style, children, ...rest }: ScreenProps) {
  const inner = padded ? [styles.padded, style] : style;

  return (
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
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.background },
  content: { flexGrow: 1, paddingTop: space.lg, paddingBottom: space['3xl'] },
  padded: { paddingHorizontal: space.lg },
});
