import type { Target } from '../api/contract';

/** Куда двигаем показатель — словами, а не стрелкой без подписи. */
export function directionText(target: Target): string {
  const unit = target.unit ? ` ${target.unit}` : '';
  const to = `${target.targetValue}${unit}`;
  if (target.direction === 'down') return `down to ${to}`;
  if (target.direction === 'up') return `up to ${to}`;
  // Незнакомое направление не толкуем: показываем цель без глагола.
  return to;
}
