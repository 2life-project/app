import { request, searchParams } from '@/core/http/client';
import type { MetricValue } from '@/shared/domain';
import { requestId } from '@/shared/lib/id';

import type { MetricCatalog, RingPreferences, SubsystemData, Subsystem } from './contract';

/** Ручки раздела «Тело»: подсистема, настройка её кольца и сами показатели. */

export function subsystemKey(subsystem: Subsystem, date: string, timeZone: string): string {
  return `body:${subsystem}:${date}:${timeZone}`;
}

export function fetchSubsystem(
  subsystem: Subsystem,
  date: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<SubsystemData> {
  const path = `/api/v2/body/subsystems/${subsystem}?${searchParams({ date, timezone: timeZone })}`;
  return request<SubsystemData>(path, { signal });
}

/**
 * Смена показателя в кольце. Ревизия обязательна: без неё сервер не отличит
 * запись поверх свежей настройки от повторной отправки той же.
 */
export function saveRingMetric(
  preferences: RingPreferences,
  ringMetric: string,
): Promise<RingPreferences> {
  return request<RingPreferences>(`/api/v2/body/subsystems/${preferences.subsystem}/preferences`, {
    method: 'PUT',
    body: {
      schemaVersion: preferences.schemaVersion,
      revision: preferences.revision,
      ringMetric,
    },
  });
}

export function fetchMetricCatalog(
  subsystem: Subsystem,
  signal?: AbortSignal,
): Promise<MetricCatalog> {
  return request<MetricCatalog>(`/api/v2/metrics?${searchParams({ subsystem })}`, { signal });
}

export function metricKey(key: string, start: string, end: string, timeZone: string): string {
  return `metric:${key}:${start}:${end}:${timeZone}`;
}

/** Один показатель с историей, источниками и базой сравнения. */
export function fetchMetric(
  key: string,
  start: string,
  end: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<MetricValue> {
  const path = `/api/v2/metrics/${encodeURIComponent(key)}?${searchParams({ start, end, timezone: timeZone })}`;
  return request<MetricValue>(path, { signal });
}

/**
 * Ручной ввод измерения. Адрес берётся из `manual.endpoint` самого показателя,
 * а не зашит здесь: сервер сам говорит, куда писать этот показатель.
 *
 * Отправляем ровно то, что ввёл человек, в единице из `manual.unit` — пересчёт
 * делает сервер и возвращает своё значение со своей единицей.
 */
export function saveMeasurement(
  metric: MetricValue,
  value: number,
  timeZone: string,
): Promise<unknown> {
  const manual = metric.manual;
  if (!manual?.allowed) throw new Error(`metric ${metric.key} is not writable by hand`);
  return request(manual.endpoint, {
    method: 'POST',
    body: {
      requestId: requestId(),
      measuredAt: new Date().toISOString(),
      timezone: timeZone,
      measurements: [{ metric: metric.key, value, unit: manual.unit }],
    },
  });
}
