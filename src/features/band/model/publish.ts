import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import type { Coverage, TimeQuality } from '../api';

import type { BandState } from './band-state';
import { clockWasReset, ensureBinding, latestBinding } from './binding';
import { loadDay } from './history-store';
import { enqueue } from './outbox';
import { draftsOf, samplesOf } from './outbox-records';
import { flushOutbox } from './upload';

/**
 * Что из прочитанного ставить в очередь и с каким окном покрытия.
 *
 * Отдельно от отправки (`upload.ts`): сложить прочитанное — дело мгновенное и
 * обязано случиться сразу, браслет затирает историю сам; отправить — дело
 * сети, которой может не быть.
 */

/**
 * Сложить прочитанное в очередь и попытаться отправить.
 *
 * Вызывается после чтения устройства. Регистрация браслета идёт здесь же:
 * версию привязки выдаёт сервер, и до первого ответа отправлять нечего и
 * некуда.
 */
export async function publishToServer(state: BandState): Promise<void> {
  const account = currentUser()?.id;
  if (!account) return;

  const binding = await ensureBinding(state.info, state.clockSkew ?? null);
  if (!binding) {
    logger.warn('band: отправлять некуда — привязки нет', { mac: state.info?.mac ?? null });
    return;
  }

  const drafts = draftsOf(state);
  logger.info('band: к отправке', { drafts: drafts.length, bandId: binding.bandId });
  if (drafts.length > 0) {
    await enqueue(account, binding.bandId, drafts, {
      timeQuality: qualityOf(state.clockSkew ?? null),
      epoch: binding.epoch,
      coverage: coverageOf(state),
    });
  }

  await flushOutbox();
}

/**
 * Насколько верить времени прочитанного. Часы не прочитались — время не
 * подтверждено, и `known` тут был бы догадкой; расходились заметно — история
 * писалась по другому времени, и выдавать её за точную нельзя.
 */
function qualityOf(clockSkewSeconds: number | null): TimeQuality {
  if (clockSkewSeconds === null) return 'unknown';
  return clockWasReset(clockSkewSeconds) ? 'clock_reset' : 'known';
}

/**
 * Окно, которое клиент считает вычитанным.
 *
 * Только поминутная история: остальное приходит цельными сущностями, у которых
 * период не определён. `complete` не ставим — сутки ещё идут, а объявить
 * неполный день полным значит скрыть от сервера пропуск.
 */
function coverageOf(state: BandState): Coverage[] {
  const first = state.today[0];
  const last = state.today[state.today.length - 1];
  if (!first || !last) return [];

  return [
    {
      stream: 'activity_samples',
      from: first.at.toISOString(),
      to: last.at.toISOString(),
      complete: false,
    },
  ];
}

/**
 * Отправить сутки, дочитанные в архив.
 *
 * Отдельно от `publishToServer`, потому что дочитанных суток нет в состоянии
 * раздела: они идут прямо в архив на диске, минуя экран, — человек в это время
 * смотрит на уже показанные числа. Не отправить их отсюда значит не отправить
 * вовсе: на устройстве история живёт около четырёх суток и затирается молча.
 */
export async function publishDays(
  days: readonly string[],
  clockSkewSeconds: number | null,
): Promise<void> {
  const account = currentUser()?.id;
  const binding = account ? await latestBinding(account) : null;
  if (!account || !binding || days.length === 0) return;

  for (const day of days) {
    const stored = await loadDay(day);
    if (!stored || stored.samples.length === 0) continue;

    await enqueue(account, binding.bandId, samplesOf(stored.samples), {
      timeQuality: qualityOf(clockSkewSeconds),
      epoch: binding.epoch,
      // Эти сутки кончились, и окно прочитано целиком — в отличие от текущего
      // дня, про который такого сказать нельзя.
      coverage: coverageOfDay(day),
    });
  }

  await flushOutbox();
}

function coverageOfDay(day: string): Coverage[] {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return [];

  return [
    {
      stream: 'activity_samples',
      from: new Date(year, month - 1, date).toISOString(),
      to: new Date(year, month - 1, date + 1).toISOString(),
      complete: true,
    },
  ];
}
