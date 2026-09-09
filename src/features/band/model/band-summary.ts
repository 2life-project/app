import type { SectionSummaryRow } from '@/shared/ui';

import { seriesOf, startOfToday, stressPoints, summaryOf } from './day-metrics';
import type { BandState } from './use-band';
import { walkOf } from './walk-metrics';

/**
 * Шапка раздела: одно число крупно и четыре опорных строки.
 *
 * Раздел показывает десяток показателей, и без такой шапки все они весят
 * одинаково — человек листает десять одинаковых карточек, чтобы понять, что с
 * ним сейчас. Ровно так устроены остальные разделы приложения.
 */

export type Summary = {
  ring: {
    value: number | null;
    valueLabel: string;
    note?: string;
    tone?: 'success' | 'warning' | 'danger';
  };
  caption: string;
  rows: SectionSummaryRow[];
};

/** Норма сна, к которой считается доля кольца в строке. */
const SLEEP_TARGET_MINUTES = 8 * 60;

export function summaryOfBand(state: BandState): Summary {
  const heart = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const range = summaryOf(heart);
  const current = state.measurement?.heartRate ?? state.live?.heartRate ?? range?.last;
  const walk = walkOf(state.today);
  const stress = stressPoints(state.stress, startOfToday());
  const oxygen = state.measurement?.bloodOxygen ?? state.live?.bloodOxygen;
  const distance = state.summary?.distance ?? walk?.distance ?? 0;

  const sleepMinutes = state.sleep
    .filter((segment) => segment.stage !== 'awake' && segment.minutes > 0)
    .reduce((total, segment) => total + segment.minutes, 0);

  return {
    // Шкала кольца — сегодняшний размах пульса: цели по частоте человек не
    // задавал, а «где я сейчас между своим минимумом и максимумом за день» —
    // это измеренное, а не выдуманное основание для дуги.
    ring: {
      value: arcOf(current, range),
      valueLabel: current === undefined ? '—' : String(current),
      note: range ? `${range.min}–${range.max} today` : 'bpm',
      tone: toneOf(current),
    },
    caption: captionOf(state),
    rows: [
      {
        id: 'steps',
        title: 'Steps',
        // Шаги и метры — из одного источника: устройство считает дневной итог
        // само, и брать число оттуда, а расстояние из истории значит показать
        // две цифры, которые между собой не сходятся.
        subtitle: distance === 0 ? 'no movement yet' : `${kilometres(distance)} km`,
        value: String(state.summary?.steps ?? walk?.steps ?? 0),
      },
      {
        id: 'sleep',
        title: 'Sleep',
        subtitle: sleepMinutes === 0 ? 'no night recorded' : share(sleepMinutes),
        value: sleepMinutes === 0 ? '—' : duration(sleepMinutes),
      },
      {
        id: 'stress',
        title: 'Stress',
        subtitle: stress.length === 0 ? 'not measured' : `${stress.length} readings`,
        value: String(state.measurement?.stress ?? stress[stress.length - 1]?.value ?? '—'),
      },
      {
        id: 'oxygen',
        title: 'Blood oxygen',
        subtitle: oxygen === undefined ? 'not measured' : 'last reading',
        value: oxygen === undefined ? '—' : `${oxygen}%`,
      },
    ],
  };
}

/** Доля дуги: где текущий пульс между минимумом и максимумом за сутки. */
function arcOf(current: number | undefined, range: ReturnType<typeof summaryOf>): number | null {
  if (current === undefined || !range || range.max === range.min) return null;
  return Math.max(0, Math.min(1, (current - range.min) / (range.max - range.min)));
}

/** Цвет кольца — по зоне пульса: он кодирует отклонение от покоя, а не саму частоту. */
function toneOf(current: number | undefined): 'success' | 'warning' | 'danger' | undefined {
  if (current === undefined) return undefined;
  if (current < 99) return 'success';
  if (current < 138) return 'warning';
  return 'danger';
}

/**
 * Состояние связи, заряд и прошивка одной строкой в шапке. Отдельным текстом
 * под карточкой это висело сиротой, не принадлежа ни ей, ни следующей.
 */
function captionOf(state: BandState): string {
  const parts = [state.stage === 'connected' ? 'LIVE' : 'LAST KNOWN'];
  if (state.battery !== undefined) parts.push(`${state.battery}%`);
  if (state.firmware) parts.push(state.firmware);
  if (state.worn === true && state.stage === 'connected') parts.push('WORN');
  return parts.join(' · ');
}

function share(minutes: number): string {
  return `${Math.round((minutes / SLEEP_TARGET_MINUTES) * 100)}% of 8h`;
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}
