import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';
import { Text } from '@/shared/ui';

import type { Zone } from '../model/day-metrics';

/**
 * Доли по зонам одной полосой.
 *
 * Строкой на зону это занимало шесть строк, из которых пять показывали ноль:
 * пустые проценты читаются как данные и вытесняют то, что действительно есть.
 * Полоса показывает распределение целиком, а подписи остаются только у зон, в
 * которых человек побывал.
 */

/** Тон растёт вместе с номером зоны: цвет кодирует отклонение от покоя. */
const TONES = ['success', 'success', 'highlight', 'warning', 'danger', 'danger'] as const;

export function ZoneBars({ zones, all = false }: { zones: readonly Zone[]; all?: boolean }) {
  const withTone = zones.map((zone, index) => ({ ...zone, tone: TONES[index] ?? 'danger' }));
  // На обзоре нули прячем, в разборе показываем: там человек пришёл смотреть
  // именно распределение, и «в этой зоне не был ни минуты» — тоже ответ.
  const visible = all ? withTone : withTone.filter((zone) => zone.share > 0);

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.strip}>
        {visible
          .filter((zone) => zone.share > 0)
          .map((zone) => (
            <View
              key={zone.label}
              style={{
                flexGrow: zone.share,
                flexBasis: 0,
                backgroundColor: theme.color[zone.tone].solid,
              }}
            />
          ))}
      </View>

      <View style={styles.legend}>
        {visible.map((zone) => (
          <View key={zone.label} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: theme.color[zone.tone].solid }]} />
            <Text variant="caption" tone="muted">
              {zone.label} {zone.share}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  strip: {
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 2,
    height: 10,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  dot: {
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
});
