import type { FoodHit, FoodItem, MealType } from '../api/food';

/**
 * Питание: пересчёт порций и сборка дня.
 *
 * Продукт в поиске описан на 100 г, а съедено сколько-то грамм — пересчитывает
 * клиент, потому что порцию выбирает человек, а не сервер.
 */
export const MEALS: readonly { type: MealType; title: string; icon: string }[] = [
  { type: 'breakfast', title: 'Breakfast', icon: '☕️' },
  { type: 'lunch', title: 'Lunch', icon: '🍲' },
  { type: 'dinner', title: 'Dinner', icon: '🥗' },
  { type: 'snack', title: 'Snack', icon: '🍎' },
] as const;

/**
 * Как дневная норма делится между приёмами. Доли наши, а не серверные: сервер
 * хранит одну цель на день. Числа — из привычной раскладки 25/45/25/5.
 */
const SHARE: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.45,
  dinner: 0.25,
  snack: 0.05,
};

export function mealGoal(dailyGoal: number | null, meal: MealType): number | null {
  return dailyGoal === null ? null : Math.round(dailyGoal * SHARE[meal]);
}

export type Macros = { calories: number; protein: number; fat: number; carbs: number };

export function portion(hit: FoodHit, grams: number): Macros {
  const scale = grams / 100;
  return {
    calories: (hit.calories100g ?? 0) * scale,
    protein: (hit.protein100g ?? 0) * scale,
    fat: (hit.fat100g ?? 0) * scale,
    carbs: (hit.carbs100g ?? 0) * scale,
  };
}

export function itemMacros(item: FoodItem): Macros {
  return {
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
  };
}

export function kcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

/** Подпись порции: у продукта она своя, иначе просто граммы. */
export function servingLabel(hit: FoodHit): string {
  return hit.servingLabel ?? '100 g';
}
