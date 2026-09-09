import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';
import { Text } from '@/shared/ui';

import type { SleepSegment, SleepStageOnly } from '../api';
import { clock, duration } from '../model/format';

/**
 * Ход ночи по стадиям — дорожками, а не одной полосой.
 *
 * Одна полоса из чередующихся цветов читается как штрихкод: глаз видит смену,
 * но не видит, что глубже, а что ближе к пробуждению. Дорожки ставят стадию по
 * вертикали, как в любой гипнограмме, и ночь становится рельефом.
 */

/** Порядок дорожек сверху вниз: от бодрствования к самому глубокому сну. */
const LANES: readonly { label: string; stage: SleepStageOnly }[] = [
  { label: 'Пробуждения', stage: 'awake' },
  { label: 'REM', stage: 'rem' },
  { label: 'Лёгкий', stage: 'light' },
  { label: 'Глубокий', stage: 'deep' },
];

/** Цвет углубляется вместе со стадией: глубокий сон — самый плотный тон. */
const STAGE_COLOR: Record<SleepStageOnly, string> = {
  awake: theme.color.warning.solid,
  rem: theme.color.highlight.solid,
  light: theme.color.accent.border,
  deep: theme.color.accent.solid,
  nap: theme.color.accent.border,
  snore: theme.color.neutral.border,
};

/** Минимальная ширина отрезка в процентах: минута из восьми часов иначе исчезает. */
const MIN_WIDTH = 0.6;

export function Hypnogram({
  segments,
  totals,
}: {
  segments: readonly SleepSegment[];
  /** Сколько минут в каждой стадии: число стоит у своей дорожки, а не отдельным блоком. */
  totals: Record<SleepStageOnly, number>;
}) {
  // Сортировка и разбор по дорожкам — четыре прохода по всем отрезкам ночи.
  // В теле рендера они повторялись на каждую перерисовку панели.
  const sorted = useMemo(
    () => [...segments].sort((a, b) => a.at.getTime() - b.at.getTime()),
    [segments],
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;

  const from = first.at.getTime();
  const to = last.at.getTime() + last.minutes * 60_000;
  const span = to - from;
  if (span <= 0) return null;

  return (
    <View style={styles.wrap}>
      {LANES.map((lane) => (
        <View key={lane.stage} style={styles.lane}>
          <Text variant="caption" tone="muted" style={styles.label}>
            {lane.label}
          </Text>
          <View style={styles.track}>
            {sorted
              .filter((segment) => segment.stage === lane.stage)
              .map((segment, index) => (
                <View
                  key={`${segment.at.getTime()}-${index}`}
                  style={[
                    styles.block,
                    {
                      left: `${((segment.at.getTime() - from) / span) * 100}%`,
                      width: `${Math.max(MIN_WIDTH, ((segment.minutes * 60_000) / span) * 100)}%`,
                      // Маркеры сессии на дорожки не попадают: они отфильтрованы
                      // выше, и цвета у них нет.
                      backgroundColor: STAGE_COLOR[segment.stage as SleepStageOnly],
                    },
                  ]}
                />
              ))}
          </View>
          <Text variant="caption" style={styles.total}>
            {totals[lane.stage] === 0 ? '—' : duration(totals[lane.stage])}
          </Text>
        </View>
      ))}

      <View style={styles.axis}>
        <Text variant="caption" tone="muted">
          {clock(new Date(from))}
        </Text>
        <Text variant="caption" tone="muted">
          {clock(new Date(to))}
        </Text>
      </View>
    </View>
  );
}

/** Высота дорожки стадии: соседние не должны сливаться в одну полосу. */
/** Колонки подписи и итога: ширина фиксирована, чтобы дорожки были в одной сетке. */
const LABEL_WIDTH = space.cardX * 2 + space.sm;
const TOTAL_WIDTH = space.cardX * 3 + space.sm;

const LANE_HEIGHT = space.md;

const styles = StyleSheet.create({
  wrap: {
    gap: space.xs,
  },
  lane: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  label: {
    width: LABEL_WIDTH,
  },
  total: {
    // Итог стоит у своей дорожки: отдельным блоком под графиком он заставлял
    // сопоставлять цвет с числом, а здесь они на одной строке.
    textAlign: 'right',
    width: TOTAL_WIDTH,
  },
  track: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: radius.sm,
    flex: 1,
    height: LANE_HEIGHT,
    overflow: 'hidden',
  },
  block: {
    // Без скругления: на дорожке в четырнадцать точек радиус карточки
    // превращает короткий отрезок в кружок, и он перестаёт читаться как
    // промежуток времени. Края всей дорожки скругляет она сама.
    borderRadius: radius.none,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // Дорожки сдвинуты подписью слева: без того же отступа время не совпадает
    // с началом шкалы.
    paddingLeft: LABEL_WIDTH + space.sm,
    paddingRight: TOTAL_WIDTH + space.sm,
  },
});
