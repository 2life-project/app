import { request } from '@/core/http/client';
import { createEvent } from '@/shared/domain';
import { requestId } from '@/shared/lib/id';

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

function query(date: string, timeZone: string, form: string): string {
  return new URLSearchParams({
    schemaVersion: '2',
    date,
    timezone: timeZone,
    form,
  }).toString();
}

export function checkinKey(date: string, timeZone: string, form: string): string {
  return `checkin:${date}:${timeZone}:${form}`;
}

export function fetchCheckin(
  date: string,
  timeZone: string,
  form: string,
  signal?: AbortSignal,
): Promise<Checkin> {
  return request<Checkin>(`/api/v2/wellbeing/checkin?${query(date, timeZone, form)}`, { signal });
}

/**
 * Сохраняются только явно заполненные ответы: пустой вопрос остаётся пустым,
 * а не уезжает на сервер нулём. Ревизия обязательна — она отличает запись
 * поверх свежих ответов от повторной отправки тех же.
 */
export function saveCheckin(
  checkin: Checkin,
  answers: Record<string, number>,
  measuredAt: string,
): Promise<Checkin> {
  const path = `/api/v2/wellbeing/checkin?${query(checkin.date, checkin.timezone, checkin.form)}`;

  return request<Checkin>(path, {
    method: 'PUT',
    body: {
      requestId: requestId(),
      questionnaireVersion: checkin.questionnaire.version,
      revision: checkin.revision,
      measuredAt,
      answers,
    },
  });
}

/** Заметка дня. Своего поля у чек-ина нет — она уходит событием журнала. */
export function createNote(text: string, startAt: string, timeZone: string): Promise<unknown> {
  return createEvent({
    title: 'Note from the check-in',
    startAt,
    timezone: timeZone,
    event: { kind: 'note', text, tags: [] },
  });
}
