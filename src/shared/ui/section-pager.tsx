import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { space, theme } from '@/shared/theme';

export type SectionPagerProps = {
  /** Текущая страница. Меняется и свайпом, и извне — из ряда чипов. */
  index: number;
  onIndexChange: (index: number) => void;
  pages: ReactNode[];
};

/**
 * Разделы листаются, а не подменяются. Горизонтальный скролл с прилипанием к
 * странице даёт и жест влево-вправо, и связь с рядом чипов, и отсутствие
 * мерцания: страницы живут одновременно, ничего не размонтируется.
 *
 * Каждая страница прокручивается по вертикали сама — вложение скроллов разной
 * ориентации конфликта не даёт.
 *
 * Сверху лежит полоса, в которой уезжающие строки тают, — как внизу они тают
 * под панелью навигации. Полоса живёт здесь, а не на экране, и вместе со своим
 * отступом: без отступа она ложится на первую карточку и затемняет ей верх,
 * хотя карточка стоит на месте и растворять в ней нечего.
 */
export function SectionPager({ index, onIndexChange, pages }: SectionPagerProps) {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const current = useRef(index);

  useEffect(() => {
    if (current.current === index) return;
    current.current = index;
    ref.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  return (
    <View style={styles.fill}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Прилипание к странице считает система, поэтому жест не «вязнет».
        decelerationRate="fast"
        // Система сама подкладывает горизонтальному скроллу вставку безопасной
        // зоны и уводит страницы вниз на её высоту. Здесь отступы считает шапка.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          if (next === current.current) return;
          current.current = next;
          onIndexChange(next);
        }}>
        {pages.map((page, pageIndex) => (
          <ScrollView
            key={pageIndex}
            style={{ width }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
            // Обе вставки выключены осознанно: система иначе добавляет странице
            // высоту безопасной зоны сверху, и контент отъезжает от шапки.
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}>
            {page}
          </ScrollView>
        ))}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={[theme.color.backdrop[0], `${theme.color.backdrop[0]}00`]}
        style={styles.fade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    paddingHorizontal: space.screen,
    // Ровно высота полосы: содержимое начинается там, где она уже прозрачна.
    paddingTop: space.lg,
    paddingBottom: space['3xl'],
  },
  fade: { position: 'absolute', top: 0, left: 0, right: 0, height: space.lg },
});
