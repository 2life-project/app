import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, type Tone } from '@/shared/theme';

import { ProgressRing } from './progress-ring';
import { SummaryRow } from './summary-row';
import { Text } from './text';
import { WidgetCard } from './widget-card';

export type SectionSummaryRow = {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  onPress?: () => void;
};

export type SectionSummaryProps = {
  title: string;
  action: { label: string; onPress: () => void; chevron?: boolean };
  /** Строка под заголовком. Всегда одна строка — иначе кольцо съезжает вниз. */
  caption: ReactNode;
  ring: {
    /** `null` — шкалы для дуги нет: кольцо остаётся дорожкой с числом. */
    value: number | null;
    valueLabel: string;
    note?: string;
    tone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  };
  rows: SectionSummaryRow[];
};

/**
 * Шапка суб-раздела: кольцо и сводка. Одна на все разделы намеренно — иначе
 * кольцо в каждом оказывается своего размера и на своей высоте, что и было.
 * Размер и высота заданы здесь и нигде больше.
 */
export function SectionSummary({ title, action, caption, ring, rows }: SectionSummaryProps) {
  return (
    <WidgetCard title={title} action={action}>
      <View style={styles.caption}>{caption}</View>
      <View style={styles.body}>
        <ProgressRing
          size={RING_SIZE}
          thickness={RING_THICKNESS}
          value={ring.value}
          valueLabel={ring.valueLabel}
          note={ring.note}
          tone={ring.tone}
          valueVariant="headline"
        />
        <View style={styles.rows}>
          {rows.map((row, index) => (
            <SummaryRow
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              value={row.value}
              divider={index > 0}
              onPress={row.onPress}
            />
          ))}
        </View>
      </View>
    </WidgetCard>
  );
}

/** Подпись под заголовком раздела — всегда в одну строку. */
export function SectionCaption({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="muted" numberOfLines={1}>
      {children}
    </Text>
  );
}

const RING_SIZE = 132;
const RING_THICKNESS = 12;
/** Высота строки подписи фиксирована: от неё зависит положение кольца. */
const CAPTION_HEIGHT = 18;

const styles = StyleSheet.create({
  caption: { height: CAPTION_HEIGHT, justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.sm },
  rows: { flex: 1 },
});
