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

export const NOTHING: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

/** Продукт из поиска, пересчитанный на съеденные граммы. */
export function portion(hit: FoodHit, grams: number): Macros {
  const scale = grams / 100;
  return {
    calories: (hit.calories100g ?? 0) * scale,
    protein: (hit.protein100g ?? 0) * scale,
    fat: (hit.fat100g ?? 0) * scale,
    carbs: (hit.carbs100g ?? 0) * scale,
  };
}

export function sum(items: readonly Macros[]): Macros {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      fat: total.fat + item.fat,
      carbs: total.carbs + item.carbs,
    }),
    NOTHING,
  );
}

/** Разобранная позиция из фото или текста — уже в граммах, пересчёт не нужен. */
export function itemMacros(item: FoodItem): Macros {
  return {
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
  };
}

/**
 * Сколько осталось до цели. Отрицательное значение не прячем: перебор — это
 * тоже факт дня, и «0 осталось» вместо «−300» скрыл бы его.
 */
export function left(goal: number | null, eaten: number): number | null {
  return goal === null ? null : goal - eaten;
}

/** Доля цели, 0–1. Без цели доли нет: считать её от нуля нечестно. */
export function share(goal: number | null, eaten: number): number | null {
  if (goal === null || goal <= 0) return null;
  return Math.min(1, Math.max(0, eaten / goal));
}

export function grams(value: number): string {
  return `${Math.round(value)} g`;
}

export function kcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

/** Подпись порции: у продукта она своя, иначе просто граммы. */
export function servingLabel(hit: FoodHit): string {
  return hit.servingLabel ?? '100 g';
}
