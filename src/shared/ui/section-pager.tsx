import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { space } from '@/shared/theme';

export type SectionPagerProps = {
  /** Текущая страница. Меняется и свайпом, и извне — из ряда чипов. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Отступ сверху: под неподвижной шапкой, чтобы контент начинался под ней. */
  contentTop: number;
  pages: ReactNode[];
};

/**
 * Разделы листаются, а не подменяются. Горизонтальный скролл с прилипанием к
 * странице даёт и жест влево-вправо, и связь с рядом чипов, и отсутствие
 * мерцания: страницы живут одновременно, ничего не размонтируется.
 *
 * Каждая страница прокручивается по вертикали сама — вложение скроллов разной
 * ориентации конфликта не даёт.
 */
export function SectionPager({ index, onIndexChange, contentTop, pages }: SectionPagerProps) {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const current = useRef(index);

  useEffect(() => {
    if (current.current === index) return;
    current.current = index;
    ref.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  return (
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
          {/*
            Место под неподвижной шапкой держит распорка, а не верхний отступ:
            к отступу система прибавляет свои вставки, и контент уезжает вниз на
            высоту безопасной зоны. У блока с заданной высотой такого нет.
          */}
          <View style={{ height: contentTop }} />
          {page}
        </ScrollView>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.screen, paddingBottom: space['3xl'] },
});
