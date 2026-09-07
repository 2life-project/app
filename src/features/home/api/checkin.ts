import { request } from '@/core/http/client';

/**
 * Чек-ин самочувствия. Каждый ответ несёт свою шкалу и версию анкеты: старые
 * ответы не пересчитываются под новую анкету, поэтому показывать ответ надо
 * против его собственных `minimum`/`maximum`, а не против вопроса.
 */
export type CheckinQuestion = {
  key: string;
  title: string;
  minimum: number;
  maximum: number;
  metric: string;
};

export type CheckinAnswer = {
  value: number;
  minimum: number;
  maximum: number;
  version: string;
  timezone: string;
  measuredAt: string;
};

export type Checkin = {
  schemaVersion: number;
  date: string;
  timezone: string;
  form: string;
  revision: number;
  questionnaire: { version: string; questions: readonly CheckinQuestion[] };
  answers: Record<string, CheckinAnswer | null>;
  progress: { completed: number; total: number; status: string };
};

export function checkinKey(date: string, timeZone: string): string {
  return `checkin:${date}:${timeZone}`;
}

export function fetchCheckin(
  date: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<Checkin> {
  const query = new URLSearchParams({
    schemaVersion: '2',
    date,
    timezone: timeZone,
    form: 'short',
  }).toString();

  return request<Checkin>(`/api/v2/wellbeing/checkin?${query}`, { signal });
}
