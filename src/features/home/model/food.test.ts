import type { FoodHit, FoodItem } from '../api/food';

import { itemMacros, mealGoal, portion } from './food';

const hit = (extra: Partial<FoodHit>) =>
  ({ calories100g: 100, protein100g: 10, fat100g: 5, carbs100g: 20, ...extra }) as FoodHit;

describe('portion', () => {
  it('продукт описан на 100 г — пересчитываем на съеденные граммы', () => {
    expect(portion(hit({}), 250)).toEqual({ calories: 250, protein: 25, fat: 12.5, carbs: 50 });
  });

  it('незаполненное поле продукта считаем нулём, а не роняем расчёт', () => {
    expect(portion(hit({ protein100g: null }), 100).protein).toBe(0);
  });
});

describe('itemMacros', () => {
  it('разобранная позиция уже в граммах — пересчёт не нужен', () => {
    const item = { calories: 89, protein: 3.2, fat: 1, carbs: 17.4 } as FoodItem;
    expect(itemMacros(item)).toEqual({ calories: 89, protein: 3.2, fat: 1, carbs: 17.4 });
  });
});

describe('mealGoal', () => {
  it('дневная норма делится между приёмами', () => {
    expect(mealGoal(2500, 'lunch')).toBe(1125);
    expect(mealGoal(2500, 'breakfast')).toBe(625);
    expect(mealGoal(2500, 'snack')).toBe(125);
  });

  it('без дневной цели цели приёма тоже нет', () => {
    expect(mealGoal(null, 'lunch')).toBeNull();
  });
});
