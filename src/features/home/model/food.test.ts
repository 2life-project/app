import type { FoodHit, FoodItem } from '../api/food';

import { left, mealGoal, portion, share, sum, itemMacros, NOTHING } from './food';

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

describe('sum', () => {
  it('пустой список даёт нули', () => {
    expect(sum([])).toEqual(NOTHING);
  });

  it('складывает все четыре числа', () => {
    const total = sum([portion(hit({}), 100), portion(hit({}), 100)]);
    expect(total).toEqual({ calories: 200, protein: 20, fat: 10, carbs: 40 });
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

describe('left', () => {
  it('перебор показывается отрицательным, а не нулём', () => {
    expect(left(2000, 2300)).toBe(-300);
  });

  it('без цели остатка не существует', () => {
    expect(left(null, 500)).toBeNull();
  });
});

describe('share', () => {
  it('доля не выходит за отрезок', () => {
    expect(share(1000, 500)).toBe(0.5);
    expect(share(1000, 1500)).toBe(1);
  });

  it('без цели и при нулевой цели доли нет', () => {
    expect(share(null, 100)).toBeNull();
    expect(share(0, 100)).toBeNull();
  });
});
