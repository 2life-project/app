import { request } from '@/core/http/client';
import type { MetricValue } from '@/shared/domain';

import type { MetricCatalog, RingPreferences, SubsystemData, Subsystem } from './contract';

/** Ручки раздела «Тело»: подсистема, настройка её кольца и сами показатели. */

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export function subsystemKey(subsystem: Subsystem, date: string, timeZone: string): string {
  return `body:${subsystem}:${date}:${timeZone}`;
}

export function fetchSubsystem(
  subsystem: Subsystem,
  date: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<SubsystemData> {
  const path = `/api/v2/body/subsystems/${subsystem}?${query({ date, timezone: timeZone })}`;
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
  return request<MetricCatalog>(`/api/v2/metrics?${query({ subsystem })}`, { signal });
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
  const path = `/api/v2/metrics/${encodeURIComponent(key)}?${query({ start, end, timezone: timeZone })}`;
  return request<MetricValue>(path, { signal });
}
