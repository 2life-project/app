import { request } from '@/core/http/client';

/**
 * Питание. Формы взяты из спеки — здесь она их описывает, в отличие от
 * дневного ответа.
 *
 * Продукт из поиска приходит в расчёте на 100 г, а съеденное считается в
 * граммах: пересчёт делает клиент, потому что порцию выбирает человек.
 */
export type FoodHit = {
  id: string;
  source: string;
  name: string;
  brand: string | null;
  calories100g: number | null;
  protein100g: number | null;
  fat100g: number | null;
  carbs100g: number | null;
  fiber100g: number | null;
  /** Как называется порция у этого продукта: «1 кусочек (28 г)». */
  servingLabel: string | null;
};

/** Разбор фотографии и текста возвращает уже съеденное — в граммах. */
export type FoodItem = {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  glycemicIndex: number | null;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function searchFood(query: string, signal?: AbortSignal): Promise<FoodHit[]> {
  return request<FoodHit[]>(`/api/food/search?${new URLSearchParams({ q: query }).toString()}`, {
    signal,
  });
}

/** «Съел тарелку борща и два куска хлеба» — сервер разбирает это на позиции. */
export function analyzeText(text: string): Promise<{ items: FoodItem[] }> {
  return request<{ items: FoodItem[] }>('/api/food/analyze-text', {
    method: 'POST',
    body: { text },
  });
}

export function analyzePhoto(
  imageBase64: string,
  mediaType: string,
): Promise<{ items: FoodItem[] }> {
  return request<{ items: FoodItem[] }>('/api/food/analyze-photo', {
    method: 'POST',
    body: { imageBase64, mediaType },
  });
}

/**
 * Записать съеденное. Сервер принимает готовые числа, а не ссылку на продукт:
 * пересчёт на порцию уже сделан, и запись не зависит от того, что случится с
 * карточкой продукта потом.
 */
export function logMeal(
  date: string,
  meal: MealType,
  item: { calories: number; protein: number; fat: number; carbs: number; fiber?: number },
): Promise<unknown> {
  return request('/api/daily/' + encodeURIComponent(date) + '/meal', {
    method: 'POST',
    body: {
      mealType: meal,
      time: new Date().toISOString(),
      calories: Math.round(item.calories),
      protein: round(item.protein),
      fat: round(item.fat),
      carbs: round(item.carbs),
      fiber: item.fiber === undefined ? undefined : round(item.fiber),
    },
  });
}

export function dayKey(date: string): string {
  return `daily:${date}`;
}

/**
 * День целиком. Форму сервер не описывает, поэтому читаем её осторожно —
 * см. `dayView` в модели: там сказано, что именно мы ищем в ответе.
 */
export function fetchDay(date: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>(`/api/daily/${encodeURIComponent(date)}`, { signal });
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
