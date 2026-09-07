import type { MetricValue } from '@/shared/domain';

/**
 * Что не так с введённым значением. Границы приходят от сервера в `manual` —
 * они здесь, чтобы человек узнал о них до отправки, а не из ответа 422.
 * Сервер всё равно проверяет их у себя: это подсказка, а не защита.
 */
export function manualError(metric: MetricValue, input: string): string | null {
  const manual = metric.manual;
  if (!manual?.allowed) return 'This metric cannot be entered by hand.';

  const value = Number(input.replace(',', '.'));
  if (input.trim() === '' || !Number.isFinite(value)) return 'Enter a number.';

  const { minimum, maximum, minimumExclusive, unit } = manual;
  if (minimum !== null && (minimumExclusive ? value <= minimum : value < minimum)) {
    return `Must be ${minimumExclusive ? 'above' : 'at least'} ${minimum} ${unit}.`;
  }
  if (maximum !== null && value > maximum) return `Must be at most ${maximum} ${unit}.`;
  return null;
}

/** Число из введённого текста. Запятая — тот же разделитель, что и точка. */
export function manualValue(input: string): number {
  return Number(input.replace(',', '.'));
}
