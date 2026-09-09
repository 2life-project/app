import * as cmd from './commands';
import { type Alarm, alarms as encodeAlarms } from './outbound';
import { intField, parseModal, toUtf16 } from './tlv';
import type { BandTransport } from './transport';

export type { Alarm } from './outbound';

/**
 * Будильники браслета.
 *
 * Устройство принимает их **только целиком**: слоты, которых нет в записи,
 * обнуляются. Поэтому каждое изменение — это чтение, правка и запись всего
 * списка. Прятать это в вызывающем коде нельзя: тот, кто напишет один
 * будильник напрямую, сотрёт остальные и узнает об этом от пользователя.
 */

/** Дни недели битами: воскресенье — младший бит, суббота — шестой. */
export const Weekday = {
  sunday: 1 << 0,
  monday: 1 << 1,
  tuesday: 1 << 2,
  wednesday: 1 << 3,
  thursday: 1 << 4,
  friday: 1 << 5,
  saturday: 1 << 6,
} as const;

export const WEEKDAYS =
  Weekday.monday | Weekday.tuesday | Weekday.wednesday | Weekday.thursday | Weekday.friday;
export const WEEKEND = Weekday.saturday | Weekday.sunday;
export const EVERY_DAY = WEEKDAYS | WEEKEND;

/**
 * Разбор списка. Поля приходят по одному на свойство, и в каждом первый байт —
 * номер слота: устройство отдаёт не «будильник целиком», а «свойство такого-то
 * будильника», поэтому список собирается по слотам.
 */
export function decodeAlarms(body: Uint8Array): Alarm[] {
  const slots = new Map<number, Alarm>();

  const ensure = (slot: number): Alarm => {
    const existing = slots.get(slot);
    if (existing) return existing;
    const created: Alarm = { slot, enabled: false, hour: 0, minute: 0, days: 0 };
    slots.set(slot, created);
    return created;
  };

  for (const item of parseModal(body)) {
    const value = item.value;
    const slot = value[0];
    if (slot === undefined || slot === 0) continue;

    const alarm = ensure(slot);
    if (item.tag === 0x02) alarm.days = value[1] ?? 0;
    if (item.tag === 0x03) alarm.enabled = value[1] === 1;
    if (item.tag === 0x04) {
      alarm.hour = value[1] ?? 0;
      alarm.minute = value[2] ?? 0;
    }
    if (item.tag === 0x05) alarm.label = toUtf16(value.subarray(1));
  }

  return [...slots.values()].sort((a, b) => a.slot - b.slot);
}

export class BandAlarms {
  constructor(private readonly transport: BandTransport) {}

  async list(): Promise<Alarm[]> {
    return decodeAlarms(await this.transport.request(cmd.readAlarms()));
  }

  /**
   * Сколько будильников прошивка вообще держит. Знать это нужно до добавления:
   * иначе свободный слот подбирается вслепую и лишний просто не сохранится.
   */
  async limit(): Promise<number | undefined> {
    const body = await this.transport.request(cmd.readAlarmLimits());
    return intField(parseModal(body), 0x0a);
  }

  /** Записать список целиком. Всё, чего в нём нет, на устройстве исчезнет. */
  async save(list: readonly Alarm[]): Promise<void> {
    for (const frame of encodeAlarms(list)) await this.transport.send(frame);
  }

  /**
   * Добавить будильник в первый свободный слот. Предел числа слотов прошивка
   * не сообщает — переполнение она отклонит сама, и это её право.
   */
  async add(alarm: Omit<Alarm, 'slot'>): Promise<Alarm[]> {
    const list = await this.list();
    const used = new Set(list.map((item) => item.slot));

    let slot = 1;
    while (used.has(slot)) slot += 1;

    const next = [...list, { ...alarm, slot }];
    await this.save(next);
    return next;
  }

  async update(slot: number, patch: Partial<Omit<Alarm, 'slot'>>): Promise<Alarm[]> {
    const next = (await this.list()).map((item) =>
      item.slot === slot ? { ...item, ...patch } : item,
    );
    await this.save(next);
    return next;
  }

  async setEnabled(slot: number, enabled: boolean): Promise<Alarm[]> {
    return this.update(slot, { enabled });
  }

  async remove(slot: number): Promise<Alarm[]> {
    const next = (await this.list()).filter((item) => item.slot !== slot);
    await this.save(next);
    return next;
  }

  /** Стереть все: устройство принимает пустой список как обнуление слотов. */
  async clear(): Promise<void> {
    await this.save([]);
  }
}
