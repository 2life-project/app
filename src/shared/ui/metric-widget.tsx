import Feather from '@expo/vector-icons/Feather';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme, type Tone } from '@/shared/theme';

import { ActionLink } from './action-link';
import { Card } from './card';
import { ProgressRing } from './progress-ring';
import { StatTile, type StatTileProps } from './stat-tile';
import { Text } from './text';

type IconName = keyof typeof Feather.glyphMap;

export type MetricWidgetProps = {
  icon: IconName;
  title: string;
  action: { label: string; onPress: () => void };
  ring: {
    value: number | null;
    valueLabel: string;
    /** Слово под числом: «почти без движения» объясняет 0.9 лучше шкалы. */
    note?: string;
    tone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  };
  tiles: StatTileProps[];
  /** Что добавить под числами: у питания там полоса приёмов. */
  children?: ReactNode;
};

/**
 * Виджет системы тела: кольцо и две плитки показателей. Один шаблон на все
 * четыре системы — в макете они отличаются только содержимым.
 */
export function MetricWidget({ icon, title, action, ring, tiles, children }: MetricWidgetProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name={icon} size={ICON} color={theme.color.text} />
          <Text variant="subtitle">{title}</Text>
        </View>
        <ActionLink {...action} />
      </View>

      <View style={styles.body}>
        <ProgressRing
          size={RING}
          value={ring.value}
          valueLabel={ring.valueLabel}
          note={ring.note}
          tone={ring.tone}
        />
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </View>
      </View>

      {children}
    </Card>
  );
}

const ICON = 17;
const RING = 60;

const styles = StyleSheet.create({
  card: { gap: 11 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tiles: { flex: 1, flexDirection: 'row', gap: 8 },
});
