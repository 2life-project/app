import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ActionLink, Card, ProgressBar, Stack, Text, WidgetCard } from '@/shared/ui';

import { type SleepSession } from '../api';
import { SLEEP_TARGET_MINUTES } from '../model/analysis';
import { clock, duration } from '../model/format';

import { BandEmpty } from './band-empty';
import { Hypnogram } from './hypnogram';

/**
 * Последняя ночь: ход по стадиям и итоги.
 *
 * Показывается именно ночь, а не сумма за неделю — стадии имеют смысл внутри
 * одного сна, а сложенные за семь дней они не значат ничего.
 */
export function SleepCard({
  sleep,
  reading,
  onOpen,
}: {
  sleep: readonly SleepSession[];
  reading: boolean;
  onOpen: () => void;
}) {
  // Сессии приходят по возрастанию времени: последняя — самая свежая.
  const night = sleep[sleep.length - 1];

  if (!night) {
    return (
      <WidgetCard variant="sunken" title="Sleep">
        <BandEmpty reading={reading} text="No night recorded yet" />
      </WidgetCard>
    );
  }

  // Время во сне без пробуждений: именно оно сравнивается с нормой, а «в
  // постели» завышает результат на каждый подъём среди ночи.
  const asleep = night.asleep;

  return (
    <Card variant="sunken">
      <Stack gap="md">
        <View style={styles.header}>
          <Text variant="subtitle">Sleep</Text>
          <ActionLink label="Details" chevron onPress={onOpen} />
        </View>

        <Text variant="caption" tone="muted">
          {clock(night.from)} — {clock(night.to)}
        </Text>

        <View style={styles.value}>
          <Text variant="metric">{duration(asleep)}</Text>
          <Text variant="bodySmall" tone="muted">
            asleep · {share(asleep, SLEEP_TARGET_MINUTES)}% of 8h
          </Text>
        </View>

        <ProgressBar value={Math.min(1, asleep / SLEEP_TARGET_MINUTES)} tone={toneOf(asleep)} />

        <Hypnogram segments={night.segments} totals={night.totals} />
      </Stack>
    </Card>
  );
}

/**
 * Цвет полосы. Норма — ориентир, а не порог: недобрать полчаса до восьми часов
 * не значит провалить ночь, и красить такую ночь тревожным цветом — врать.
 */
function toneOf(asleep: number): 'success' | 'warning' | 'danger' {
  const share = asleep / SLEEP_TARGET_MINUTES;
  if (share >= 0.85) return 'success';
  if (share >= 0.6) return 'warning';
  return 'danger';
}

function share(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
});
