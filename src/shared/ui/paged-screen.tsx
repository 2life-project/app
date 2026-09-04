import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, theme } from '@/shared/theme';

import { SectionPager } from './section-pager';
import { Segmented } from './segmented';
import { Stack } from './stack';
import { Text } from './text';

export type PagedScreenProps<T extends string> = {
  /** Заголовок экрана. У Главной вместо него своя шапка — см. `header`. */
  title?: string;
  subtitle?: string;
  /** Своя шапка вместо заголовка: у Главной там дата, статус и кнопки. */
  header?: ReactNode;
  sections: readonly { value: T; label: string }[];
  /** Страницы в том же порядке, что и разделы: иначе свайп и чипы разойдутся. */
  pages: ReactNode[];
};

/** Полоса, в которой контент растворяется под шапкой. */
const FADE = 24;

/**
 * Экран с суб-навигацией: шапка сверху, под ней листаемые разделы.
 *
 * Шапка стоит в обычном потоке, а не поверх страниц. Наложение выглядело
 * так же, но требовало вручную считать её высоту и вычитать системные
 * вставки — и промахивалось то в отступ, то в спрятанную под шапкой строку.
 * Растворение при этом сохранено: полоса градиента лежит поверх верхнего
 * края области страниц, и уезжающие строки тают в ней, как внизу тают под
 * панелью навигации.
 */
export function PagedScreen<T extends string>({
  title,
  subtitle,
  header,
  sections,
  pages,
}: PagedScreenProps<T>) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const current = sections[index]?.value ?? sections[0]?.value;

  return (
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Stack gap="md">
          {header ?? (
            <Stack gap="xs">
              <Text variant="display">{title}</Text>
              {subtitle ? (
                <Text variant="bodySmall" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </Stack>
          )}

          {current === undefined ? null : (
            <Segmented
              items={sections}
              value={current}
              onChange={(value) => setIndex(sections.findIndex((item) => item.value === value))}
            />
          )}
        </Stack>
      </View>

      <View style={styles.fill}>
        <SectionPager index={index} onIndexChange={setIndex} pages={pages} />
        <LinearGradient
          pointerEvents="none"
          colors={[theme.color.backdrop[0], `${theme.color.backdrop[0]}00`]}
          style={styles.fade}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.screen, paddingBottom: space.md },
  fade: { position: 'absolute', top: 0, left: 0, right: 0, height: FADE },
});
