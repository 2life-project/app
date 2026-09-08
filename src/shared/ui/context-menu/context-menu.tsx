import { useCallback, useState } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Text } from '../text';

import type { ContextMenuProps } from './model';

/**
 * Меню там, где нативного нет: лист снизу. Не пытается изображать якорный
 * поповер — на Android меню у нижнего края и есть привычная форма, а подделка
 * якоря без нативного контроллера всегда мажет мимо пальца.
 */
export function ContextMenu({ items, renderTrigger }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {renderTrigger(() => setOpen(true))}
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <RNPressable style={styles.backdrop} onPress={close} accessibilityLabel="Закрыть меню">
          <View style={styles.sheet}>
            {items.map((item) => (
              <RNPressable
                key={item.id}
                accessibilityRole="menuitem"
                onPress={() => {
                  close();
                  item.onPress();
                }}
                style={styles.item}>
                <Text tone={item.tone === 'danger' ? 'danger' : 'default'}>{item.label}</Text>
              </RNPressable>
            ))}
          </View>
        </RNPressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.color.overlay },
  sheet: {
    margin: space.md,
    padding: space.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.color.surface,
    boxShadow: theme.elevation.high,
  },
  item: {
    minHeight: size.tapTarget,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
});
