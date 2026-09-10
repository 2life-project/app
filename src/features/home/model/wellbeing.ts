import { formatNumber, NO_VALUE } from '@/shared/domain';

import type { Checkin } from '../api/checkin';
import type { HomeData, WellbeingData } from '../api/contract';

import { dataOf, serverTone, type StatusTone } from './section';
import type { Tile } from './vitals';

/**
 * Раздел «Самочувствие». Шкала общей оценки в контракте не названа, поэтому
 * кольцо показывает число без дуги. Вывод и план дня приходят от сервера
 * готовым текстом — их не переписывают и не сокращают.
 */
export type WellbeingView = {
  ring: { value: number | null; valueLabel: string; note?: string; tone?: StatusTone };
  caption: string;
  rows: { id: string; title: string; subtitle?: string; value: string }[];
  factors: Tile[];
  /** Оценки за неделю без пропусков: график рисует замеры, а не нули вместо них. */
  series: number[];
  recommendation: { text: string; actions: readonly string[] };
};

export function wellbeingOf(home: HomeData): WellbeingView | null {
  const wellbeing: WellbeingData | null = dataOf(home.rings.wellbeing);
  if (!wellbeing) return null;

  const { score, status, recommendation, factorBreakdown, sevenDayProfile, day } = wellbeing;
  const filled = sevenDayProfile.filter((entry) => entry.hasEntry).length;

  return {
    ring: {
      value: null,
      valueLabel: score === null ? NO_VALUE : formatNumber(score, 'score'),
      tone: serverTone(recommendation.tone),
    },
    caption: `DAY SCORE · ${status}`,
    rows: [
      { id: 'checkin', title: 'Check-in', subtitle: 'today', value: status },
      { id: 'week', title: 'Filled', subtitle: 'days of the last seven', value: `${filled} of 7` },
      {
        id: 'symptoms',
        title: 'Symptoms',
        subtitle: 'noted today',
        value: String(day.symptoms.length),
      },
    ],
    factors: factorBreakdown.map((factor) => ({
      label: factor.label.toUpperCase(),
      value: formatNumber(factor.value, 'score'),
    })),
    series: sevenDayProfile
      .map((entry) => entry.score)
      .filter((value): value is number => value !== null),
    recommendation: {
      text: recommendation.text,
      actions: recommendation.actions,
    },
  };
}

export function checkinCaption(checkin: Checkin | null): string | undefined {
  if (!checkin) return undefined;
  const { completed, total } = checkin.progress;
  return completed >= total ? `all ${total} answered` : `${completed} of ${total} answered`;
}
