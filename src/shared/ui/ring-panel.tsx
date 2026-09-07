import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, type Tone } from '@/shared/theme';

import { Card } from './card';
import { ProgressRing } from './progress-ring';
import { Stack } from './stack';
import { SummaryRow, type SummaryRowProps } from './summary-row';
import { Text } from './text';

export type RingPanelProps = {
  title: string;
  /** Строка под заголовком: на чём стоит число в кольце. */
  caption?: string;
  /** Справа в шапке: метка состояния или ссылка. */
  action?: ReactNode;
  ring: {
    value: number | null;
    valueLabel: string;
    note?: string;
    tone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  };
  /** Строки справа от кольца, разделённые волосяной линией. */
  rows: readonly SummaryRowProps[];
};

/**
 * Крупная панель показателя: кольцо слева, разбор справа. Одна на все экраны,
 * где это встречается, — иначе кольцо в каждом оказывается своего размера и на
 * своей высоте.
 */
export function RingPanel({ title, caption, action, ring, rows }: RingPanelProps) {
  return (
    <Card>
      <Stack gap="md">
        <Stack direction="row" justify="space-between" align="center">
          <Stack gap="xs">
            <Text variant="subtitle">{title}</Text>
            {caption ? (
              <Text variant="caption" tone="muted">
                {caption}
              </Text>
            ) : null}
          </Stack>
          {action}
        </Stack>

        <View style={styles.body}>
          <ProgressRing
            size={RING}
            thickness={RING_THICKNESS}
            value={ring.value}
            valueLabel={ring.valueLabel}
            note={ring.note}
            valueVariant="headline"
            tone={ring.tone}
          />
          <View style={styles.rows}>
            {rows.map((row, index) => (
              <SummaryRow key={row.title} {...row} divider={index > 0} />
            ))}
          </View>
        </View>
      </Stack>
    </Card>
  );
}

const RING = 124;
const RING_THICKNESS = 12;

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  rows: { flex: 1 },
});
