import type { BandLimits } from '../api';

import type { Draft } from './outbox';
import type { Envelope } from './outbox-store';

/** Общие заготовки тестов очереди: один аккаунт, один браслет, тесные пределы. */

export const ACCOUNT = 'user-1';
export const BAND = 'band-1';

export const LIMITS: BandLimits = {
  maxRecordsPerBatch: 2,
  maxBatchBytes: 512 * 1024,
  maxRecordBytes: 256 * 1024,
  audioPartBytes: 8 << 20,
  maxAudioBytes: 256 << 20,
};

export const ENVELOPE: Envelope = {
  bindingVersion: 1,
  clientInstanceId: 'install-1',
  deviceEpoch: 'epoch-1',
  moduleVersion: '0.1.0',
  timezone: 'Europe/Moscow',
};

export const KNOWN = { timeQuality: 'known' } as const;

export function minute(at: string, steps: number): Draft {
  return {
    stream: 'activity_samples',
    key: `history|${at}`,
    at: new Date(at),
    payload: { at, source: 'history', steps },
  };
}

export function summary(date: string, steps: number): Draft {
  return {
    stream: 'day_summaries',
    key: date,
    at: new Date(`${date}T12:00:00.000Z`),
    payload: { date, totals: { steps } },
  };
}
