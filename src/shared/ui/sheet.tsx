import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, theme } from '@/shared/theme';

import { Stack } from './stack';
import { Text } from './text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Правое действие в шапке шита: «Done», «Save». */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Панель снизу поверх экрана: выбор слоя, выбор показателя. Затемнение
 * закрывает по нажатию — иначе шит без явной кнопки становится ловушкой.
 */
export function Sheet({ visible, onClose, title, action, children }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Закрыть" onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <Stack gap="md">
          <Stack direction="row" justify="space-between" align="center">
            <Text variant="subtitle">{title}</Text>
            {action}
          </Stack>
          {children}
        </Stack>
      </View>
    </Modal>
  );
}

const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 4;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.color.overlay },
  sheet: {
    paddingHorizontal: space.cardX,
    paddingTop: space.sm,
    gap: space.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.color.background,
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: theme.color.border,
  },
});
