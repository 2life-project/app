import type { HomeData, NutritionData, WellbeingData } from '../api/contract';

import { nutritionOf } from './nutrition';
import { wellbeingOf } from './wellbeing';

/**
 * Живой ответ DEV: без записанной еды подсказки нет, без чек-ина нет
 * рекомендации — сервер шлёт `null`. Экран обязан это пережить, а не падать
 * на первом же обращении к полю: так и случилось на первом запуске с телефона.
 */
const nutrition = {
  date: '2026-09-11',
  timeZone: 'Europe/Moscow',
  totals: { calories: null, protein: null, fat: null, carbs: null, fiber: null },
  goals: { calories: null, protein: null, fat: null, carbs: null, fiber: null, provenance: {} },
  remainingCalories: null,
  completeness: 0,
  insight: null,
  meals: [],
  provenance: { source: 'journal', observedAt: null },
} satisfies NutritionData;

const wellbeing = {
  day: { date: '2026-09-11', daily: null, symptoms: [], notes: [] },
  score: null,
  status: 'empty',
  recommendation: null,
  factorBreakdown: [],
  sevenDayProfile: [],
  ring: {
    metric: 'wellbeing',
    value: null,
    unit: 'score',
    status: 'empty',
    percent: null,
    percentBasis: null,
  },
} satisfies WellbeingData;

const home = (patch: Partial<HomeData['rings']>): HomeData =>
  ({
    rings: {
      nutrition: { status: 'available', data: nutrition, error: null },
      wellbeing: { status: 'available', data: wellbeing, error: null },
      ...patch,
    },
  }) as HomeData;

describe('пустой день без подсказок', () => {
  it('питание без подсказки не падает и не выдумывает её', () => {
    const view = nutritionOf(home({}));
    expect(view?.insight).toBeNull();
    expect(view?.ring.tone).toBeUndefined();
  });

  it('самочувствие без рекомендации не падает', () => {
    const view = wellbeingOf(home({}));
    expect(view?.recommendation).toBeNull();
    expect(view?.ring.tone).toBeUndefined();
  });
});
