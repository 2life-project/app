import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type TimelineRowProps = {
  time: string;
  title: string;
  subtitle?: string;
  /** `done` — уже прошло, `next` — ближайшее, `upcoming` — впереди. */
  state?: 'done' | 'next' | 'upcoming';
  /** Метка у ближайшего события. */
  badge?: string;
  /** Строка ведёт к пункту: без обработчика она просто строка. */
  onPress?: () => void;
};

/** Строка плана дня: время, точка, событие. Ближайшее выделено плашкой. */
export function TimelineRow({
  time,
  title,
  subtitle,
  state = 'upcoming',
  badge,
  onPress,
}: TimelineRowProps) {
  const muted = state === 'done';

  const row = (
    <View style={[styles.row, state === 'next' && styles.next]}>
      <Text variant="bodySmall" tone="muted" style={styles.time}>
        {time}
      </Text>
      <View style={styles.dot} />
      <View style={styles.body}>
        <Text variant="body" tone={muted ? 'muted' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text variant="caption" tone="highlight">
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{row}</Pressable> : row;
}

const DOT = 7;
/** Вертикальное поле метки — из макета, вне шага сетки. */
const BADGE_PADDING_Y = 3;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  next: {
    backgroundColor: theme.color.highlight.surface,
    borderColor: theme.color.highlight.border,
  },
  time: { width: 44 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: theme.color.textDisabled,
  },
  body: { flex: 1, gap: 2 },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: BADGE_PADDING_Y,
    borderRadius: radius.full,
    backgroundColor: theme.color.highlight.surfacePressed,
  },
});
