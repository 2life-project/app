import type { ActivitySample } from '../api';

import { INITIAL, type BandState } from './band-state';
import { draftsOf, samplesOf } from './outbox-records';

const NOW = new Date('2026-09-10T18:00:00.000Z');

function sample(at: string, source: ActivitySample['source'], steps: number): ActivitySample {
  return { at: new Date(at), source, steps };
}

function stateWith(patch: Partial<BandState>): BandState {
  return { ...INITIAL, ...patch };
}

const streams = (state: BandState) => draftsOf(state, NOW).map((draft) => draft.stream);

describe('draftsOf', () => {
  it('на пустом разделе отправлять нечего', () => {
    expect(draftsOf(INITIAL, NOW)).toEqual([]);
  });

  // Живой отчёт описывает недобранную минуту и всегда занижен относительно её
  // итога. Та же минута приезжает историей — отправлять оба значит слать
  // вдвое больше ради числа, которое приёмник всё равно перекроет.
  it('живые отчёты не уезжают, история уезжает', () => {
    const state = stateWith({
      today: [
        sample('2026-09-10T09:00:00.000Z', 'history', 40),
        sample('2026-09-10T09:01:00.000Z', 'live', 3),
      ],
    });

    const drafts = draftsOf(state, NOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.key).toBe('history|2026-09-10T09:00:00.000Z');
  });

  // Приёмник хранит исходный объект модуля целиком, включая то, для чего у
  // него пока нет разбора. Переименуй поля — и потерянное не восстановить.
  it('поля модуля не переименовываются, а даты становятся строками', () => {
    const drafts = samplesOf([sample('2026-09-10T09:00:00.000Z', 'history', 40)]);

    expect(drafts[0]?.payload).toEqual({
      at: '2026-09-10T09:00:00.000Z',
      source: 'history',
      steps: 40,
    });
  });

  // Время события и время чтения — разные вещи: по первому очередь понимает,
  // что уже отправлено, второе приёмник называет `capturedAt`.
  it('время заготовки — время события, а не чтения', () => {
    const drafts = samplesOf([sample('2026-09-10T09:00:00.000Z', 'history', 40)]);

    expect(drafts[0]?.at.toISOString()).toBe('2026-09-10T09:00:00.000Z');
  });

  it('снимки устройства уезжают под ключом суток', () => {
    const state = stateWith({
      info: {
        mac: 'aa:bb',
        firmware: 'x',
        battery: { level: 80, charging: false, lowBatteryAlert: false },
      },
      supported: ['heartRateVariability'],
    });

    expect(streams(state)).toEqual(['device_info', 'device_state', 'capabilities']);
    expect(draftsOf(state, NOW).map((draft) => draft.key)).toEqual([
      '2026-09-10',
      '2026-09-10',
      '2026-09-10',
    ]);
  });

  it('сон, стресс и разовый замер идут своими потоками', () => {
    const state = stateWith({
      stress: [{ midnight: new Date('2026-09-10T00:00:00.000Z'), stepMinutes: 30, samples: [] }],
      measurement: { id: 'm-1', at: new Date('2026-09-10T10:00:00.000Z'), heartRate: 62 },
    });

    expect(streams(state)).toEqual(['stress_days', 'measurements']);
  });

  // Файл могут не скачать вовсе — память браслета кончается за пятнадцать
  // часов, — а нажатие кнопки существует только в уже пришедшем отчёте.
  it('метки записи уезжают, даже пока файл не выгружен', () => {
    const state = stateWith({
      saved: [
        {
          session: 42,
          startedAt: new Date('2026-09-10T08:00:00.000Z'),
          uri: 'file:///42.ogg',
          deviceBytes: 4000,
          uploadBytes: 4301,
          seconds: 2,
          uploaded: false,
          marks: [{ index: 0, offsetSeconds: 1 }],
        },
      ],
    });

    expect(streams(state)).toEqual(['recording_marks']);
    expect(draftsOf(state, NOW)[0]?.payload).toMatchObject({ session: 42 });
  });
});
