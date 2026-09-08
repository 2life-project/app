import type { Target } from '../api/contract';

/**
 * Чтение цели. Прогресс считаем от базы к цели — обе величины назвал сервер,
 * своей нормы у клиента нет. Без базы прогресса не существует: показывать
 * долю от нуля значит выдумать точку старта.
 */
export function targetProgress(target: Target, current: number | null): number | null {
  const { baselineValue, targetValue } = target;
  if (current === null || baselineValue === null) return null;
  const span = targetValue - baselineValue;
  if (span === 0) return current === targetValue ? 1 : null;
  return Math.min(1, Math.max(0, (current - baselineValue) / span));
}

/** Куда двигаем показатель — словами, а не стрелкой без подписи. */
export function directionText(target: Target): string {
  const unit = target.unit ? ` ${target.unit}` : '';
  const to = `${target.targetValue}${unit}`;
  if (target.direction === 'decrease') return `down to ${to}`;
  if (target.direction === 'increase') return `up to ${to}`;
  if (target.direction === 'maintain') return `hold at ${to}`;
  // Незнакомое направление не толкуем: показываем цель без глагола.
  return to;
}

/** Цель ещё в работе — её и показываем. Достигнутые и снятые уходят вниз. */
export function isOpen(target: Target): boolean {
  return target.status === 'active' || target.status === 'in_progress';
}
