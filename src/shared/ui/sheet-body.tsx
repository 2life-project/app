import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { space, theme } from '@/shared/theme';

import { Stack } from './stack';
import { Text } from './text';

export type SheetBodyProps = {
  title: string;
  children: ReactNode;
  /** Действие в шапке панели: «готово», «отмена», «сохранить». */
  action?: ReactNode;
};

/**
 * Содержимое нативной панели. Шапку и прокрутку держим сами, всё остальное —
 * граббер, скругление, затемнение, перетаскивание, закрытие свайпом и высоту
 * по содержимому — даёт система через `presentation: 'formSheet'`.
 *
 * `collapsable={false}` обязателен: нативный шит раскладывает содержимое сам и
 * ждёт не больше двух своих детей. Без пометки React Native схлопывает эту
 * обёртку, шит видит все строки сразу и рисует их поверх шапки.
 */
export function SheetBody({ title, children, action }: SheetBodyProps) {
  return (
    <View style={styles.root} collapsable={false}>
      <View style={styles.header} collapsable={false}>
        <Text variant="subtitle" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {action}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Stack gap="md">{children}</Stack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: theme.color.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.screen,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  title: { flex: 1 },
  content: { paddingHorizontal: space.screen, paddingBottom: space.xl },
});
