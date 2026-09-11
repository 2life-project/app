import type { ProtocolBundle, Rule } from '../api/contract';

/** Идёт ли протокол сейчас. Незнакомый статус не считаем завершённым. */
export function isFinished(bundle: ProtocolBundle): boolean {
  const { status } = bundle.protocol;
  return status === 'completed' || status === 'archived';
}

/** Из чего протокол состоит: правила, цели, рекомендации. */
export function protocolParts(bundle: ProtocolBundle): string {
  const parts = [
    bundle.rules.length > 0 ? `${bundle.rules.length} rules` : null,
    bundle.targets.length > 0 ? `${bundle.targets.length} targets` : null,
    bundle.recommendations.length > 0 ? `${bundle.recommendations.length} tips` : null,
  ].filter(Boolean);
  return parts.length === 0 ? 'no details yet' : parts.join(' · ');
}

/**
 * Расписание правила словами. Виды расписания сервер называет сам; здесь
 * они читаются по полям, которые есть, а не по словарю, которого нет.
 */
export function ruleSchedule(rule: Rule): string {
  const { schedule } = rule;
  const when =
    schedule.date ?? (schedule.days ? `days ${schedule.days.join(', ')}` : schedule.kind);
  const time = schedule.time ? ` · ${schedule.time}` : '';
  const length = schedule.durationMinutes ? ` · ${schedule.durationMinutes} min` : '';
  return `${when}${time}${length}`;
}

/** Название правила — его вид словами: своего имени у правила нет. */
export function ruleTitle(rule: Rule): string {
  return rule.type.replace(/_/g, ' ');
}
