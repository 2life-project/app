import type { SectionSummaryRow } from '@/shared/ui';

import { HEART_RATE_ZONES, SLEEP_TARGET_MINUTES } from './analysis';
import type { BandState } from './band-state';
import { seriesOf, startOfToday, stressPoints, summaryOf } from './day-metrics';
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

export function summaryOfBand(state: BandState): Summary {
  const heart = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const range = summaryOf(heart);
  const current = state.measurement?.heartRate ?? state.live?.heartRate ?? range?.last;
  const walk = walkOf(state.today);
  const stress = stressPoints(state.stress, startOfToday());
  const oxygen = state.measurement?.bloodOxygen ?? state.live?.bloodOxygen;
  const distance = state.summary?.totals.distance ?? walk?.distance ?? 0;

  // Последняя сессия, а не сумма за неделю: сложенные ночи не значат ничего.
  const sleepMinutes = state.sleep[state.sleep.length - 1]?.asleep ?? 0;

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
        value: String(state.summary?.totals.steps ?? walk?.steps ?? 0),
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

/**
 * Цвет кольца — по зоне пульса: он кодирует отклонение от покоя, а не саму
 * частоту. Границы берутся из общих зон, а не пишутся числами: иначе кольцо
 * красится по одним порогам, а полоса зон под ним рисуется по другим.
 */
const CALM_ZONES = 1;
const WARM_ZONES = 3;

function toneOf(current: number | undefined): 'success' | 'warning' | 'danger' | undefined {
  if (current === undefined) return undefined;

  const zone = HEART_RATE_ZONES.findIndex((item) => current >= item.from && current <= item.to);
  if (zone < CALM_ZONES) return 'success';
  if (zone < WARM_ZONES) return 'warning';
  return 'danger';
}

/**
 * Состояние связи, заряд и прошивка одной строкой в шапке. Отдельным текстом
 * под карточкой это висело сиротой, не принадлежа ни ей, ни следующей.
 */
function captionOf(state: BandState): string {
  const parts = [state.stage === 'connected' ? 'LIVE' : 'LAST KNOWN'];
  const battery = state.info?.battery?.level;
  if (battery !== undefined) parts.push(`${battery}%`);
  if (state.info?.firmware) parts.push(state.info.firmware);
  if (state.worn === true && state.stage === 'connected') parts.push('WORN');
  return parts.join(' · ');
}

function share(minutes: number): string {
  const target = Math.round(SLEEP_TARGET_MINUTES / 60);
  return `${Math.round((minutes / SLEEP_TARGET_MINUTES) * 100)}% of ${target}h`;
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}
