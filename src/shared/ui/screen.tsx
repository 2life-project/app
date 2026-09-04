import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, theme } from '@/shared/theme';

// Наследуемся от ScrollViewProps, а не от ViewProps: иначе экран со списком
// не сможет передать `refreshControl` — он есть только у скролла.
/** Высота растворения у верхнего края: статус-бар плюс запас под ним. */
const TOP_FADE = 96;

export type ScreenProps = ScrollViewProps & {
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
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, inner]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // Контент обязан уезжать ПОД панель навигации, а не упираться в неё:
            // стекло преломляет то, что под ним, и без этого выглядит плоским.
            // Система сама добавит отступ снизу, чтобы низ списка оставался
            // доступным.
            contentInsetAdjustmentBehavior="automatic"
            {...rest}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, inner]} {...rest}>
            {children}
          </View>
        )}
      </SafeAreaView>

      {/*
        Контент должен растворяться вверху так же, как внизу он уходит под
        стеклянную панель. Без этого лента упирается в статус-бар обрезанной
        строкой. Полоса лежит поверх скролла и не ловит касания.
      */}
      {scroll ? (
        <LinearGradient
          pointerEvents="none"
          colors={[theme.color.backdrop[0], `${theme.color.backdrop[0]}00`]}
          style={styles.topFade}
        />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: space['3xl'] },
  padded: { paddingHorizontal: space.screen },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: TOP_FADE },
});
