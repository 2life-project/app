import { formatNumber, NO_VALUE } from '@/shared/domain';
import type { Tone } from '@/shared/theme';

import type { HomeData, NutritionData } from '../api/contract';

import { dataOf, serverTone, type StatusTone } from './section';

/**
 * Раздел «Питание». Съеденное сравнивается только с целью, которую назвал
 * сервер: без цели доли нет, а «примерная норма» — это оценка, которой никто
 * не давал.
 */
/** Тона полосы прогресса: к трём статусным добавлен нейтральный акцент. */
type BarTone = Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;

export type MacroView = {
  label: string;
  value: string;
  note?: string;
  progress?: { value: number; tone: BarTone };
};

/**
 * Ячейка сетки макросов: кольцо, название и «съедено из цели». Одно число —
 * одно место: калории раньше стояли и в кольце, и в остатке, и в полосе дня.
 */
export type MacroCell = {
  id: string;
  label: string;
  /** Готовая подпись «1 000 / 2 300 ккал»: единица у калорий своя. */
  text: string;
  fill: number | null;
  tone: BarTone;
};

export type NutritionView = {
  ring: { value: number | null; valueLabel: string; note?: string; tone?: StatusTone };
  caption: string;
  /** `metric` — ключ из каталога показателей: по нему открывается его экран. */
  rows: { id: string; title: string; subtitle?: string; value: string; metric?: string }[];
  macros: MacroView[];
  insight: { title: string; text: string };
  meals: number;
  /** Дневная цель по калориям: по ней полоса приёмов считает цель каждого. */
  goalCalories: number | null;
  /** Съедено за день — итог сервер знает, разбивку по приёмам пока нет. */
  eatenCalories: number | null;
  /** Четыре числа дня одной сеткой: калории, белки, углеводы, жиры. */
  grid: MacroCell[];
  /**
   * Баланс дня: съедено, осталось, сожжено. «Осталось» — главное число:
   * оно отвечает на вопрос, ради которого экран и открывают.
   */
  balance: { eaten: string; left: string; burned: string; fill: number | null };
};

function amount(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? NO_VALUE : formatNumber(value, unit);
}

/**
 * Цвет полосы макроса — это отношение к цели, а не медицинский статус: цель
 * задана явно, и превышение над ней клиент вправе посчитать сам. Норму
 * показателя он бы так считать не стал — её задаёт справочный интервал.
 */
function macroTone(ratio: number): BarTone {
  if (ratio >= 1.15) return 'danger';
  if (ratio >= 1) return 'warning';
  return 'highlight';
}

function macro(label: string, eaten: number | null, goal: number | null): MacroView {
  const ratio = goal && goal > 0 && eaten !== null ? eaten / goal : null;

  return {
    label,
    value: amount(eaten, 'g'),
    note: goal ? `of ${formatNumber(goal, 'g')} g` : undefined,
    progress: ratio === null ? undefined : { value: Math.min(1, ratio), tone: macroTone(ratio) },
  };
}

/** Ячейка сетки: доля и тон считаются от цели, которую назвал сервер. */
function cell(
  id: string,
  label: string,
  eaten: number | null,
  goal: number | null,
  unit: string,
): MacroCell {
  const ratio = goal && goal > 0 && eaten !== null ? eaten / goal : null;
  const left = goal === null ? '' : ` / ${formatNumber(goal, unit)}`;
  return {
    id,
    label,
    text: `${amount(eaten, unit)}${left} ${unit}`.trim(),
    fill: ratio === null ? null : Math.min(1, ratio),
    tone: ratio === null ? 'highlight' : macroTone(ratio),
  };
}

export function nutritionOf(home: HomeData): NutritionView | null {
  const nutrition: NutritionData | null = dataOf(home.rings.nutrition);
  if (!nutrition) return null;

  const { totals, goals, remainingCalories, insight, meals } = nutrition;
  const goalCalories = goals.calories;
  const eaten = totals.calories;

  return {
    ring: {
      value:
        goalCalories && goalCalories > 0 && eaten !== null
          ? Math.min(1, eaten / goalCalories)
          : null,
      valueLabel: amount(eaten, 'kcal'),
      note: goalCalories ? `of ${formatNumber(goalCalories, 'kcal')}` : undefined,
      tone: serverTone(insight.tone),
    },
    caption:
      remainingCalories === null
        ? 'CALORIES · no target set'
        : `CALORIES · ${formatNumber(remainingCalories, 'kcal')} kcal left`,
    rows: [
      { id: 'meals', title: 'Meals', subtitle: 'logged today', value: String(meals.length) },
      {
        id: 'fiber',
        metric: 'fiber',
        title: 'Fiber',
        subtitle: goals.fiber ? `of ${formatNumber(goals.fiber, 'g')} g` : undefined,
        value: amount(totals.fiber, 'g'),
      },
      { id: 'burned', title: 'Burned', subtitle: 'not read from the device', value: NO_VALUE },
    ],
    macros: [
      macro('PROTEIN', totals.protein, goals.protein),
      macro('CARBS', totals.carbs, goals.carbs),
      macro('FAT', totals.fat, goals.fat),
    ],
    insight: { title: insight.title, text: insight.text },
    meals: meals.length,
    goalCalories,
    eatenCalories: eaten,
    balance: {
      eaten: amount(eaten, 'kcal'),
      left: amount(remainingCalories, 'kcal'),
      // Сожжённое читается с устройства, а его сейчас нет — прочерк честнее нуля.
      burned: NO_VALUE,
      fill:
        goalCalories && goalCalories > 0 && eaten !== null
          ? Math.min(1, eaten / goalCalories)
          : null,
    },
    grid: [
      cell('calories', 'Calories', eaten, goalCalories, 'kcal'),
      cell('protein', 'Protein', totals.protein, goals.protein, 'g'),
      cell('carbs', 'Carbs', totals.carbs, goals.carbs, 'g'),
      cell('fat', 'Fat', totals.fat, goals.fat, 'g'),
    ],
  };
}
