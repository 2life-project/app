import { currentUser } from '@/core/auth';
import { env } from '@/core/config/env';
import { errorCode, HttpError, reportFailure } from '@/core/http/client';
import { logger } from '@/core/log/logger';
import { deviceTimeZone } from '@/shared/lib/day';

import { fetchReceipt, sendBatch, type Coverage, type TimeQuality } from '../api';

import type { BandState } from './band-state';
import {
  bindingsOfAccount,
  clockWasReset,
  dropStoredBinding,
  ensureBinding,
  latestBinding,
  releaseBinding,
  type Binding,
} from './binding';
import { loadDay } from './history-store';
import {
  clearOutbox,
  enqueue,
  halveDelivery,
  nextDelivery,
  requeue,
  settle,
  unfreezeDelivery,
  type Delivery,
  type Envelope,
} from './outbox';
import { draftsOf, samplesOf } from './outbox-records';

/**
 * Отправка накопленного на сервер.
 *
 * Два действия, и они намеренно раздельны. Сложить прочитанное в очередь —
 * дело мгновенное и обязано случиться сразу: браслет затирает историю сам.
 * Отправить — дело сети, которой может не быть, и её отсутствие не должно ни
 * задерживать чтение, ни терять данные.
 */

/**
 * Сколько пачек уходит за один заход. Пять сотен записей в пачке — это сутки
 * поминутной истории на три захода; двадцать пачек хватает на всю глубину,
 * которую устройство вообще хранит, и ограничивают заход, если сервер вдруг
 * отвечает успехом, не двигая очередь.
 */
const MAX_BATCHES = 20;

/** Одна отправка на приложение: фоновая задача и экран целятся в одну очередь. */
let running = false;

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

/**
 * Отправить всё, что лежит в очередях этого аккаунта.
 *
 * Без состояния раздела: вызывается и из фоновой задачи, где ни экрана, ни
 * связи с устройством нет.
 */
export async function flushOutbox(): Promise<void> {
  const account = currentUser()?.id;
  if (!account || running) return;

  running = true;
  try {
    for (const binding of await bindingsOfAccount(account)) {
      await drain(account, binding);
    }
  } finally {
    running = false;
  }
}

async function drain(account: string, binding: Binding): Promise<void> {
  const envelope: Envelope = {
    bindingVersion: binding.bindingVersion,
    clientInstanceId: binding.clientInstanceId,
    deviceEpoch: binding.epoch,
    moduleVersion: env.appVersion,
    timezone: deviceTimeZone(),
  };
  const sent: Delivery[] = [];

  for (let round = 0; round < MAX_BATCHES; round += 1) {
    const delivery = await nextDelivery(account, binding.bandId, binding.limits, envelope);
    if (!delivery) {
      if (round === 0) logger.info('band: очередь пуста', { bandId: binding.bandId });
      break;
    }

    if (!(await deliver(account, binding, delivery))) break;
    sent.push(delivery);
  }

  // Результат разбора приходит позже приёма и на очередь не влияет: пачки уже
  // приняты. Спрашиваем о нём после захода и разом, чтобы не удлинять сам
  // заход: заход ждёт сеть, а это — нет.
  if (sent.length > 0)
    void Promise.all(sent.map((delivery) => reportIssues(account, binding, delivery)));
}

/** Отправить одну пачку. `false` — дальше в этот заход идти нельзя. */
async function deliver(account: string, binding: Binding, delivery: Delivery): Promise<boolean> {
  try {
    const receipt = await sendBatch(binding.bandId, {
      deliveryId: delivery.deliveryId,
      ...delivery.envelope,
      records: delivery.records,
      coverage: delivery.coverage,
    });

    logger.info('band: пачка принята', {
      records: delivery.records.length,
      duplicate: receipt.duplicate === true,
    });

    await settle(account, binding.bandId);
    return true;
  } catch (failure) {
    return await recover(account, binding, failure);
  }
}

/**
 * Отказы, которые лечатся дроблением пачки: слишком большая, не прошедшая
 * проверку транспорта или содержащая запись, чьё имя уже занято другим
 * содержимым. Дробим, пока не останется одна запись: тогда виновата она, и
 * держать из-за неё всю очередь нельзя.
 */
const RECORD_CONFLICTS = new Set(['band_event_conflict', 'band_delivery_conflict']);

/** Что делать с отказом. Возвращает, можно ли продолжать заход. */
async function recover(account: string, binding: Binding, failure: unknown): Promise<boolean> {
  const status = failure instanceof HttpError ? failure.status : 0;
  const code = errorCode(failure);

  if (status === 413 || status === 422 || (status === 409 && RECORD_CONFLICTS.has(code ?? ''))) {
    if (await halveDelivery(account, binding.bandId)) return true;
    logger.error('band: запись отвергнута приёмником и отброшена', { status, code });
    await settle(account, binding.bandId);
    return true;
  }

  // Конверт пачки сервер уже не принимает: версия привязки у него другая.
  // Повторять нечем — эта доставка мертва. Снимаем заморозку и забываем свою
  // копию привязки: следующее подключение спросит её заново, и те же записи
  // уедут под новым именем. Новых идентификаторов ради обхода конфликта
  // здесь нет — состав записей не меняется.
  if (status === 409) {
    logger.error('band: привязка устарела', { code });
    await unfreezeDelivery(account, binding.bandId);
    await dropStoredBinding(account, binding.mac);
    return false;
  }

  // Нет доступа, нет сети, база недоступна. Ничего из этого не лечится
  // повтором прямо сейчас: очередь ждёт следующего захода как есть.
  reportFailure('band: пачка не ушла', failure);
  return false;
}

/**
 * Что приёмник сделал с принятым.
 *
 * Разбор идёт на его стороне после приёма; квитанция говорит, какие записи
 * стали показателями, а какие — нет. Временные отказы отправляются заново,
 * остальные пишутся в лог: так и выясняется, что данные доезжают, а
 * показателями не становятся.
 */
async function reportIssues(account: string, binding: Binding, delivery: Delivery): Promise<void> {
  try {
    const receipt = await fetchReceipt(binding.bandId, delivery.deliveryId);
    const troubled = receipt.records.filter((record) => record.issues.length > 0);
    if (troubled.length === 0) return;

    const failed = troubled.filter((record) => record.mappingStatus === 'failed');
    const retryable = new Set(
      failed
        .filter((record) => record.issues.some((issue) => issue.retryable))
        .map((record) => record.eventId),
    );
    const again = delivery.records.filter((record) => retryable.has(record.eventId));
    if (again.length > 0)
      await requeue(account, binding.bandId, again, delivery.envelope.deviceEpoch);

    const codes = [
      ...new Set(troubled.flatMap((record) => record.issues.map((issue) => issue.code))),
    ];
    const level = failed.length > retryable.size ? 'error' : 'warn';
    logger[level]('band: разбор пачки с оговорками', {
      status: receipt.processingStatus,
      records: troubled.length,
      failed: failed.length,
      retried: again.length,
      codes,
    });
  } catch (failure) {
    reportFailure('band: результат разбора не прочитался', failure);
  }
}

/**
 * Отвязать браслет: закрыть приём на сервере и забыть очередь.
 *
 * Накопленное принадлежало прежней привязке. Молча отправить его после
 * переподключения — под новой версией — нельзя: приёмник считает это данными
 * неизвестной принадлежности, и он прав.
 */
export async function releaseServerBinding(mac: string | undefined): Promise<void> {
  const account = currentUser()?.id;
  if (!account || !mac) return;

  const binding = (await bindingsOfAccount(account)).find((item) => item.mac === mac);
  if (binding) await clearOutbox(account, binding.bandId);
  await releaseBinding(mac);
}
