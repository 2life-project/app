import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { logger } from '@/core/log/logger';

/**
 * Что браслет намерил за сегодня — в виде, который читают экраны продукта.
 *
 * Живёт здесь, потому что читателей трое: Главная, «Тело» и Журнал, а фича
 * фиче не видна. Публикует их одна фича — браслет; остальные только читают.
 *
 * Форма плоская и без единиц-сюрпризов: метры, минуты, удары в минуту,
 * проценты. Разбирать здесь поминутную историю значило бы повторить в общем
 * слое половину модуля устройства — он сам отдаёт уже посчитанное.
 *
 * **Это второй источник, а не замена серверу.** Правило одно: то, что браслет
 * измеряет сам — пульс, сон, дыхание, вариабельность, стресс, шаги, — берётся
 * с браслета; оценки, шкалы, нормы и всё, чего у него нет, остаётся серверным.
 * Множества не пересекаются, поэтому спорить о числе некому.
 */

export type BandReadings = {
  /** `YYYY-MM-DD` по часам телефона: за какой день эти показания. */
  date: string;
  /** Когда их сняли. По нему видно, свежие они или вчерашние. */
  updatedAt: string;
  /** Была ли связь с устройством в момент снятия. */
  live: boolean;

  steps?: number;
  distanceMeters?: number;
  calories?: number;
  activeMinutes?: number;

  heartRate?: number;
  restingHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;

  bloodOxygen?: number;
  hrv?: number;
  stress?: number;

  /** Последняя ночь: минуты сна и её эффективность в процентах. */
  sleepMinutes?: number;
  sleepEfficiency?: number;

  /** Носят ли браслет прямо сейчас. Известно только при живой связи. */
  worn?: boolean;
};

const KEY = '2life:band-readings.1';

let readings: BandReadings | null = null;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

/**
 * Первое чтение с диска догоняет уже сделанную запись: браслет мог подключиться
 * раньше, чем диск ответил, и вернуть вчерашние показания поверх свежих нельзя.
 */
let touched = false;

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (touched || raw === null) return;
    readings = JSON.parse(raw) as BandReadings;
    publish();
  })
  .catch((failure: unknown) => logger.warn('Показания браслета не прочитались', { failure }));

export function setBandReadings(next: BandReadings): void {
  touched = true;
  readings = next;
  publish();

  void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((failure: unknown) =>
    logger.warn('Показания браслета не сохранились', { failure }),
  );
}

export function clearBandReadings(): void {
  touched = true;
  readings = null;
  publish();
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/**
 * Показания за указанный день или `null`.
 *
 * День спрашивается явно: экраны листают даты, и молча отдать сегодняшние
 * шаги на вчерашней странице — это ошибка, которую человек не заметит.
 */
export function useBandReadings(date: string): BandReadings | null {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => readings,
  );

  return current?.date === date ? current : null;
}

/** Насколько показания устарели, в минутах. `null` — их нет вовсе. */
export function readingsAge(current: BandReadings | null, now = new Date()): number | null {
  if (!current) return null;
  const at = new Date(current.updatedAt);
  if (Number.isNaN(at.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - at.getTime()) / 60_000));
}

/**
 * Подпись об источнике под числом.
 *
 * Она обязательна, а не украшение: рядом стоят числа сервера, и без пометки
 * человек не поймёт, почему шаги здесь и в другом разделе разные.
 */
export function readingsNote(current: BandReadings | null, now = new Date()): string | null {
  const age = readingsAge(current, now);
  if (age === null) return null;
  if (current?.live) return 'from your band, live';
  if (age < 60) return `from your band, ${age} min ago`;

  const hours = Math.round(age / 60);
  return hours < 24 ? `from your band, ${hours} h ago` : 'from your band, over a day ago';
}
