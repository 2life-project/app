import type { MetricValue } from '@/shared/domain';

import { manualError, manualValue } from './manual';

const weight = {
  key: 'weight',
  manual: {
    allowed: true,
    endpoint: '/api/v2/measurements',
    unit: 'kg',
    minimum: 0,
    maximum: null,
    minimumExclusive: true,
  },
} as MetricValue;

describe('manualError', () => {
  it('не пропускает пустое и нечисловое', () => {
    expect(manualError(weight, '')).toBe('Enter a number.');
    expect(manualError(weight, 'сорок')).toBe('Enter a number.');
  });

  it('строгий минимум отсекает саму границу', () => {
    expect(manualError(weight, '0')).toBe('Must be above 0 kg.');
    expect(manualError(weight, '0.1')).toBeNull();
  });

  it('запятая читается как десятичный разделитель', () => {
    expect(manualError(weight, '80,5')).toBeNull();
    expect(manualValue('80,5')).toBe(80.5);
  });

  it('показатель без ручного ввода не принимает ничего', () => {
    expect(manualError({ key: 'hrv' } as MetricValue, '40')).toBe(
      'This metric cannot be entered by hand.',
    );
  });
});
