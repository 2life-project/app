import type { ProtocolBundle, Target } from '../api/contract';

/**
 * Чтение протокола. Сам объект сервер в спеке не описывает, поэтому его поля
 * читаются проверкой, а не приведением к выдуманному типу: если поля нет —
 * его нет, и вместо него встаёт честная заглушка.
 *
 * Цели описаны полностью и читаются как есть — их и показываем числом.
 */
function field(source: unknown, key: string): unknown {
  return typeof source === 'object' && source !== null
    ? (source as Record<string, unknown>)[key]
    : undefined;
}

function text(source: unknown, key: string): string | null {
  const value = field(source, key);
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function protocolId(bundle: ProtocolBundle): string {
  return text(bundle.protocol, 'id') ?? '';
}

/** Название протокола. Сервер зовёт его по-разному — берём первое найденное. */
export function protocolTitle(bundle: ProtocolBundle): string {
  return (
    text(bundle.protocol, 'title') ??
    text(bundle.protocol, 'name') ??
    text(bundle.protocol, 'goal') ??
    'Protocol'
  );
}

export function protocolStatus(bundle: ProtocolBundle): string | null {
  return text(bundle.protocol, 'status');
}

/** Идёт ли протокол сейчас. Незнакомый статус не считаем завершённым. */
export function isFinished(bundle: ProtocolBundle): boolean {
  const status = protocolStatus(bundle);
  return status === 'finished' || status === 'completed' || status === 'archived';
}

/** Из чего протокол состоит — это описано, в отличие от него самого. */
export function protocolParts(bundle: ProtocolBundle): string {
  const parts = [
    bundle.rules.length > 0 ? `${bundle.rules.length} rules` : null,
    bundle.targets.length > 0 ? `${bundle.targets.length} targets` : null,
    bundle.recommendations.length > 0 ? `${bundle.recommendations.length} tips` : null,
  ].filter(Boolean);
  return parts.length === 0 ? 'no details yet' : parts.join(' · ');
}

/** Цели в работе — их и показывают на вкладке целей. */
export function openTargets(targets: readonly Target[]): Target[] {
  return targets.filter((target) => target.status === 'active' || target.status === 'in_progress');
}
