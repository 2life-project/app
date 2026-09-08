import type { Target } from '../api/contract';

import { directionText, isOpen, targetProgress } from './target';

const target = (extra: Partial<Target>) =>
  ({
    direction: 'decrease',
    targetValue: 0.9,
    baselineValue: 1.4,
    unit: 'g/L',
    ...extra,
  }) as Target;

describe('targetProgress', () => {
  it('доля считается от базы к цели, а не от нуля', () => {
    expect(targetProgress(target({}), 1.15)).toBeCloseTo(0.5);
    expect(targetProgress(target({}), 0.9)).toBe(1);
  });

  it('за пределами отрезка доля не выходит', () => {
    expect(targetProgress(target({}), 2)).toBe(0);
    expect(targetProgress(target({}), 0.1)).toBe(1);
  });

  it('без базы прогресса нет: точку старта не выдумываем', () => {
    expect(targetProgress(target({ baselineValue: null }), 1)).toBeNull();
    expect(targetProgress(target({}), null)).toBeNull();
  });
});

describe('directionText', () => {
  it('направление читается глаголом', () => {
    expect(directionText(target({}))).toBe('down to 0.9 g/L');
    expect(directionText(target({ direction: 'increase' }))).toBe('up to 0.9 g/L');
    expect(directionText(target({ direction: 'maintain' }))).toBe('hold at 0.9 g/L');
  });

  it('незнакомое направление не толкуем', () => {
    expect(directionText(target({ direction: 'oscillate' }))).toBe('0.9 g/L');
  });
});

describe('isOpen', () => {
  it('в работе — активные', () => {
    expect(isOpen(target({ status: 'active' }))).toBe(true);
    expect(isOpen(target({ status: 'achieved' }))).toBe(false);
  });
});
