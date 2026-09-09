import { StyleSheet, View } from 'react-native';

import { ActionLink, Card, Stack, SummaryRow, Text } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { seriesOf, type Point } from '../model/day-metrics';

/**
 * Показатели, которые снимаются по расписанию или по кнопке.
 *
 * Строками, а не карточками: у каждого из них за сутки один-два замера, и
 * разворачивать каждый в карточку с графиком и разбросом значит выдавать
 * единственное число за ряд. Прочерк здесь тоже данные — он говорит, что
 * датчик сегодня не включался.
 */
export function MeasurementsCard({ state, onOpen }: { state: BandState; onOpen: () => void }) {
  const rows = [
    row('Кислород', unit(pick(state, 'bloodOxygen'), '%')),
    row('ВСР', unit(pick(state, 'hrv'), ' ms')),
    row('Давление', pressure(state)),
    row('Настроение', unit(pick(state, 'mood'), '')),
    row('Сахар', unit(last(seriesOf(state.today, (s) => s.bloodSugar)), ' mmol/L')),
  ];

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Замеры</Text>
          <ActionLink label="История" chevron onPress={onOpen} />
        </View>
        {rows.map((item, index) => (
          <SummaryRow
            key={item.title}
            title={item.title}
            subtitle={item.value === '—' ? 'сегодня не измерялось' : 'последний замер'}
            value={item.value}
            divider={index > 0}
          />
        ))}
      </Stack>
    </Card>
  );
}

function row(title: string, value: string) {
  return { title, value };
}

/** Последнее известное значение: ручной замер, живой отчёт или история дня. */
function pick(state: BandState, key: 'bloodOxygen' | 'hrv' | 'mood'): number | undefined {
  return (
    state.measurement?.[key] ?? state.live?.[key] ?? last(seriesOf(state.today, (s) => s[key]))
  );
}

function last(points: readonly Point[]): number | undefined {
  return points[points.length - 1]?.value;
}

function unit(value: number | undefined, suffix: string): string {
  return value === undefined ? '—' : `${value}${suffix}`;
}

/** Давление осмысленно только парой: одно число здесь вводит в заблуждение. */
function pressure(state: BandState): string {
  const high =
    state.measurement?.systolic ??
    state.live?.systolic ??
    last(seriesOf(state.today, (s) => s.systolic));
  const low =
    state.measurement?.diastolic ??
    state.live?.diastolic ??
    last(seriesOf(state.today, (s) => s.diastolic));
  return high && low ? `${high}/${low}` : '—';
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
