import type { Target } from '../api/contract';

import { directionText } from './target';

const target = (extra: Partial<Target>) =>
  ({ direction: 'down', targetValue: 0.9, baselineValue: 1.4, unit: 'g/L', ...extra }) as Target;

describe('directionText', () => {
  it('называет направление словами сервера', () => {
    expect(directionText(target({}))).toBe('down to 0.9 g/L');
    expect(directionText(target({ direction: 'up', targetValue: 50, unit: null }))).toBe(
      'up to 50',
    );
  });

  it('незнакомое направление не толкует', () => {
    expect(directionText(target({ direction: 'sideways' }))).toBe('0.9 g/L');
  });
});
