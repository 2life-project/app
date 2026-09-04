import { color } from './colors';
import { radius, spacing } from './layout';
import { palette } from './palette';
import { textVariant } from './typography';

const COLOR = /^(#[0-9a-f]{6}|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\))$/i;

function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(leaves);
  if (value && typeof value === 'object') return Object.values(value).flatMap(leaves);
  return [];
}

describe('токены', () => {
  it('палитра состоит из разбираемых цветов', () => {
    for (const value of leaves(palette)) expect(value).toMatch(COLOR);
  });

  it('семантические цвета разрешаются в цвета, а не в undefined', () => {
    for (const value of leaves(color)) expect(value).toMatch(COLOR);
  });

  it('шаг отступов кратен двум', () => {
    for (const value of Object.values(spacing)) {
      expect(value % 2).toBe(0);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('скругления растут по шкале', () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
  });

  it('у каждой роли текста есть интерлиньяж не меньше кегля', () => {
    for (const variant of Object.values(textVariant)) {
      expect(variant.lineHeight).toBeGreaterThanOrEqual(variant.fontSize);
    }
  });
});
