import Feather from '@expo/vector-icons/Feather';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldCloseSheet } from '@/shared/lib/sheet-drag';
import { radius, size, space, spring, theme } from '@/shared/theme';

import { Text } from './text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Правое действие в шапке: «Done», «Save». Слева всегда стоит закрытие. */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Панель снизу: затемнение, ручка, шапка с закрытием, содержимое.
 *
 * Тянется вниз и закрывается смахом — на телефоне это первый жест, которым
 * человек пробует избавиться от панели, и без него шит с одной кнопкой
 * читается как ловушка. Перетаскивание висит на шапке, а не на всём шите:
 * иначе прокрутка списка внутри дерётся с ним за каждый флик.
 */
export function Sheet({ visible, onClose, title, action, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const offset = useSharedValue(0);
  const start = useSharedValue(0);

  const close = () => {
    offset.set(0);
    onClose();
  };

  const drag = Gesture.Pan()
    .onBegin(() => {
      start.set(offset.get());
    })
    // Только вниз: вверх шит отклеился бы от нижнего края.
    .onUpdate((event) => {
      offset.set(Math.max(0, start.get() + event.translationY));
    })
    .onEnd((event) => {
      if (shouldCloseSheet(offset.get(), height, event.velocityY)) {
        runOnJS(close)();
        return;
      }
      offset.set(withSpring(0, spring.snappy));
    });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  const header = (
    <View>
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={space.sm}
          onPress={close}
          style={styles.close}>
          <Feather name="x" size={size.icon.md} color={theme.color.text} />
        </Pressable>

        <Text variant="subtitle" numberOfLines={1} style={styles.title}>
          {title}
        </Text>

        {/* Пустая колонка той же ширины: без неё заголовок съезжает от центра. */}
        <View style={styles.slot}>{action}</View>
      </View>
    </View>
  );

  return (
    // Шит живёт вне потока разметки: как обычный ребёнок `Stack` его нулевой
    // хост получал бы отступ и оставлял мёртвое поле под последней карточкой.
    <View style={styles.host}>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="Close" style={styles.tapZone} onPress={close} />

          <Animated.View
            style={[styles.sheet, dragStyle]}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
            <GestureDetector gesture={drag}>{header}</GestureDetector>

            <ScrollView
              contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 5;
const CLOSE = 36;
const HEADER_HEIGHT = 60;

const styles = StyleSheet.create({
  host: { position: 'absolute', width: 0, height: 0 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.color.overlay },
  tapZone: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.color.background,
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    marginTop: space.sm,
    borderRadius: radius.full,
    backgroundColor: theme.color.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: space.cardX,
  },
  title: { flex: 1, textAlign: 'center' },
  close: {
    width: CLOSE,
    height: CLOSE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.surfaceSunken,
  },
  slot: { minWidth: CLOSE, alignItems: 'flex-end' },
  content: { paddingHorizontal: space.cardX, gap: space.md },
});
