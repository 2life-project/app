import type Feather from '@expo/vector-icons/Feather';

import { formatNumber, type BandReadings } from '@/shared/domain';
import { clockOf } from '@/shared/lib/day';

import type { HomeData } from '../api/contract';

import { dataOf } from './section';
import { recoverExtraOf, streamsOf, widgetOfType, type StreamRow } from './widget-of';

/**
 * Сводка дня — числа, за которыми человек открывает приложение: шаги, энергия,
 * пульс, сон, стресс. Как в сводке «Здоровья»: карточка на показатель, без
 * плана и решений. Браслет на руке главнее серверного числа за тот же день —
 * он свежее; чего не измерено, того и нет: пустая карточка сообщает то же,
 * что её отсутствие, но выглядит как поломка.
 */

type IconName = keyof typeof Feather.glyphMap;

export type HighlightTone = 'accent' | 'highlight' | 'success' | 'warning' | 'danger';

export type Highlight = {
  id: string;
  icon: IconName;
  tone: HighlightTone;
  /** Подпись карточки — уже капсом, как подписи плиток: капс пишет автор строки. */
  title: string;
  value: string;
  unit?: string;
  caption?: string;
  /** Ключ показателя на сервере: по нему открывается экран с графиками. */
  metric?: string;
};

function serverCaption(row: StreamRow | undefined): string | undefined {
  if (!row) return undefined;
  return row.when ? `${row.source} · ${row.when}` : row.source;
}

function card(
  base: Omit<Highlight, 'value' | 'caption'>,
  value: number | null | undefined,
  format: (value: number) => string,
  caption?: string,
): Highlight | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return { ...base, value: format(value), caption };
}

const whole = (value: number) => formatNumber(Math.round(value), 'count');
const tenth = (value: number) => (Math.round(value * 10) / 10).toFixed(1);

export function highlightsOf(home: HomeData | null, band: BandReadings | null): Highlight[] {
  const movement = home ? dataOf(home.rings.movement) : null;
  const nutrition = home ? dataOf(home.rings.nutrition) : null;
  const recover = recoverExtraOf(home ? widgetOfType(home, 'recover') : undefined);
  const streams = new Map((home ? streamsOf(home) : []).map((row) => [row.key, row]));
  const at = band ? clockOf(new Date(band.updatedAt)) : undefined;
  const fromBand = at ? `band · ${at}` : 'band';
  const metrics = movement?.metrics;

  const heartNote =
    band?.restingHeartRate !== undefined
      ? `resting ${band.restingHeartRate}`
      : band?.minHeartRate !== undefined && band.maxHeartRate !== undefined
        ? `${band.minHeartRate}–${band.maxHeartRate} today`
        : undefined;

  const cards = [
    card(
      { id: 'steps', icon: 'activity', tone: 'accent', title: 'STEPS', metric: 'steps' },
      band?.steps ?? metrics?.steps,
      whole,
      band?.steps !== undefined ? fromBand : serverCaption(streams.get('steps')),
    ),
    card(
      {
        id: 'energy',
        icon: 'zap',
        tone: 'warning',
        title: 'ACTIVE ENERGY',
        unit: 'kcal',
        metric: 'active_energy',
      },
      band?.calories ?? metrics?.activeEnergyKcal,
      whole,
      band?.calories !== undefined ? fromBand : serverCaption(streams.get('active_energy')),
    ),
    card(
      { id: 'distance', icon: 'map-pin', tone: 'accent', title: 'DISTANCE', unit: 'km' },
      band?.distanceMeters ?? metrics?.distanceMeters,
      (meters) => tenth(meters / 1000),
      band?.distanceMeters !== undefined ? fromBand : undefined,
    ),
    card(
      {
        id: 'heart',
        icon: 'heart',
        tone: 'danger',
        title: 'HEART RATE',
        unit: 'bpm',
        metric: 'heart_rate',
      },
      band?.heartRate ?? streams.get('heart_rate')?.raw,
      whole,
      band?.heartRate !== undefined
        ? (heartNote ?? fromBand)
        : serverCaption(streams.get('heart_rate')),
    ),
    card(
      { id: 'hrv', icon: 'bar-chart-2', tone: 'danger', title: 'HRV', unit: 'ms', metric: 'hrv' },
      band?.hrv ?? recover.hrvMs,
      whole,
      band?.hrv !== undefined
        ? fromBand
        : recover.restingBpm === null
          ? undefined
          : `resting ${Math.round(recover.restingBpm)} bpm`,
    ),
    card(
      {
        id: 'spo2',
        icon: 'wind',
        tone: 'highlight',
        title: 'BLOOD OXYGEN',
        unit: '%',
        metric: 'spo2',
      },
      band?.bloodOxygen ?? streams.get('spo2')?.raw,
      whole,
      band?.bloodOxygen !== undefined ? fromBand : serverCaption(streams.get('spo2')),
    ),
    card(
      {
        id: 'sleep',
        icon: 'moon',
        tone: 'highlight',
        title: 'SLEEP',
        unit: 'h',
        metric: 'sleep_duration',
      },
      band?.sleepMinutes !== undefined ? band.sleepMinutes / 60 : recover.sleepHours,
      tenth,
      band?.sleepEfficiency !== undefined
        ? `${band.sleepEfficiency}% efficiency · band`
        : recover.sleepSource === 'es100'
          ? 'last night · band'
          : 'last night',
    ),
    card(
      { id: 'stress', icon: 'thermometer', tone: 'warning', title: 'STRESS', metric: undefined },
      band?.stress,
      whole,
      fromBand,
    ),
    card(
      { id: 'calories', icon: 'coffee', tone: 'success', title: 'CALORIES EATEN', unit: 'kcal' },
      nutrition?.totals.calories,
      whole,
      nutrition?.goals.calories
        ? `of ${formatNumber(nutrition.goals.calories, 'kcal')} kcal goal`
        : 'today',
    ),
    card(
      {
        id: 'recovery',
        icon: 'battery-charging',
        tone: 'success',
        title: 'RECOVERY',
        unit: '%',
        metric: 'recovery',
      },
      home?.rings.recovery.value,
      whole,
      home?.rings.recovery.provenance?.source
        ? String(home.rings.recovery.provenance.source)
        : undefined,
    ),
  ];

  return cards.filter((item): item is Highlight => item !== null);
}
