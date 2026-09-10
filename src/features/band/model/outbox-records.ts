import type { JsonValue } from '@/core/http/client';

import type { ActivitySample } from '../api';

import type { BandState } from './band-state';
import { dayKey } from './history-store';
import type { Draft } from './outbox';

/**
 * Что из прочитанного уезжает на сервер и под каким потоком.
 *
 * Поля не переименовываются: приёмник хранит исходный объект модуля целиком,
 * включая то, для чего у него пока нет разбора. Придумать здесь «продуктовый»
 * DTO значит потерять всё, что в него не вошло, — а восстановить это будет
 * уже неоткуда: на браслете история живёт около четырёх суток.
 */

/**
 * Объект модуля в виде, пригодном для передачи.
 *
 * Через JSON намеренно: `Date` сама превращается в RFC3339, а поля без
 * значения исчезают — ровно то, чего ждёт приёмник. Своя рекурсия повторяла бы
 * это правило второй раз и разошлась бы с ним на первом же новом поле.
 * Приведение типа безопасно по построению: на входе только данные модуля,
 * функций и циклов в них нет.
 */
function plain(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/**
 * Заготовки для всего, что раздел успел прочитать.
 *
 * Живой отчёт сюда не попадает намеренно. Он описывает недобранную минуту и
 * всегда занижен относительно её итога, а та же минута приезжает историей при
 * ближайшем обновлении. Отправлять оба значит слать вдвое больше ради числа,
 * которое приёмник всё равно перекроет историей.
 */
export function samplesOf(samples: readonly ActivitySample[]): Draft[] {
  return samples
    .filter((sample) => sample.source === 'history')
    .map((sample) => ({
      stream: 'activity_samples' as const,
      key: `${sample.source}|${sample.at.toISOString()}`,
      at: sample.at,
      payload: plain(sample),
    }));
}

export function draftsOf(state: BandState, now = new Date()): Draft[] {
  const drafts: Draft[] = [];
  /** Ключ снимка — сутки: за день их много, а событие одно, последнее. */
  const today = dayKey(now);

  drafts.push(...samplesOf(state.today));

  if (state.summary) {
    drafts.push({
      stream: 'day_summaries',
      key: state.summary.date,
      at: now,
      payload: plain(state.summary),
    });
  }

  for (const night of state.sleep) {
    drafts.push({
      stream: 'sleep_sessions',
      key: night.from.toISOString(),
      at: night.from,
      payload: plain(night),
    });
  }

  for (const day of state.stress) {
    drafts.push({
      stream: 'stress_days',
      key: dayKey(day.midnight),
      at: now,
      payload: plain(day),
    });
  }

  if (state.measurement) {
    drafts.push({
      stream: 'measurements',
      key: state.measurement.id,
      at: state.measurement.at,
      payload: plain(state.measurement),
    });
  }

  for (const activity of state.states) {
    drafts.push({
      stream: 'activity_states',
      key: `${activity.stream}|${activity.at.toISOString()}`,
      at: activity.at,
      payload: plain(activity),
    });
  }

  for (const workout of state.recorded) {
    drafts.push({
      stream: 'workouts',
      key: workout.startedAt,
      at: new Date(workout.startedAt),
      payload: plain(workout),
    });
  }

  // Метки уезжают и здесь, и вместе с заявкой на аудио. Это не дубль: файл
  // могут не скачать вовсе — память браслета кончается за пятнадцать часов, —
  // а нажатие кнопки существует только в отчёте, который уже пришёл.
  for (const recording of state.saved) {
    if (recording.marks.length === 0) continue;
    drafts.push({
      stream: 'recording_marks',
      key: String(recording.session),
      at: recording.startedAt,
      payload: plain({
        session: recording.session,
        startedAt: recording.startedAt,
        marks: recording.marks,
      }),
    });
  }

  if (state.recordings.length > 0) {
    drafts.push({
      stream: 'recording_inventory',
      key: today,
      at: now,
      payload: plain({ recordings: state.recordings }),
    });
  }

  if (state.info) {
    drafts.push({ stream: 'device_info', key: today, at: now, payload: plain(state.info) });

    drafts.push({
      stream: 'device_state',
      key: today,
      at: now,
      payload: plain({
        worn: state.worn,
        battery: state.info.battery,
        storage: state.storage,
        clockSkewSeconds: state.clockSkew,
      }),
    });
  }

  if (state.supported.length > 0) {
    drafts.push({
      stream: 'capabilities',
      key: today,
      at: now,
      payload: plain({ firmware: state.info?.firmware, supported: state.supported }),
    });
  }

  return drafts;
}
