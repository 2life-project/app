import type { ActivitySample } from '../api';

import { clearHistory, dayKey, loadDay, needsRead, recentDays, rememberDay } from './history-store';

const sample = (at: string, extra: Partial<ActivitySample> = {}): ActivitySample => ({
  at: new Date(at),
  source: 'history',
  ...extra,
});

describe('dayKey', () => {
  it('сутки считаются по местным часам, а не по UTC', () => {
    // 23:30 по местному времени — это ещё сегодня, хотя в UTC уже завтра.
    const at = new Date(2026, 8, 9, 23, 30);
    expect(dayKey(at)).toBe('2026-09-09');
  });

  it('месяц и день дополняются нулём', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('recentDays', () => {
  it('глубина ограничена памятью устройства, порядок от старых к новым', () => {
    expect(recentDays(new Date(2026, 8, 9), 4)).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
    ]);
  });

  it('переход через начало месяца', () => {
    expect(recentDays(new Date(2026, 8, 1), 2)).toEqual(['2026-08-31', '2026-09-01']);
  });
});

describe('needsRead', () => {
  const now = new Date(2026, 8, 9, 12, 0);
  const stored = (readAt: Date) => ({
    date: '2026-09-08',
    readAt: readAt.toISOString(),
    samples: [],
  });

  it('сегодняшние сутки перечитываем всегда: день ещё идёт', () => {
    const today = { date: '2026-09-09', readAt: now.toISOString(), samples: [] };
    expect(needsRead('2026-09-09', today, now)).toBe(true);
  });

  it('непрочитанные сутки читаем', () => {
    expect(needsRead('2026-09-08', null, now)).toBe(true);
  });

  it('прочитанные до конца суток — перечитываем: вечера в записи ещё не было', () => {
    expect(needsRead('2026-09-08', stored(new Date(2026, 8, 8, 20, 0)), now)).toBe(true);
  });

  it('прочитанные после полуночи — полны, второй раз не читаем', () => {
    expect(needsRead('2026-09-08', stored(new Date(2026, 8, 9, 0, 1)), now)).toBe(false);
  });

  it('битая отметка чтения — читаем заново', () => {
    expect(needsRead('2026-09-08', { ...stored(now), readAt: 'вчера' }, now)).toBe(true);
  });
});

describe('rememberDay', () => {
  beforeEach(async () => {
    await clearHistory();
  });

  it('сутки ложатся на диск и читаются обратно', async () => {
    await rememberDay('2026-09-08', [sample('2026-09-08T10:00:00', { steps: 12 })], 'aa:bb');
    const stored = await loadDay('2026-09-08');

    expect(stored?.samples).toHaveLength(1);
    expect(stored?.samples[0]?.steps).toBe(12);
    expect(stored?.mac).toBe('aa:bb');
    // Время должно вернуться датой, а не строкой: на нём считают графики.
    expect(stored?.samples[0]?.at).toBeInstanceOf(Date);
  });

  it('второе чтение дополняет, а не затирает прочитанное', async () => {
    await rememberDay('2026-09-08', [sample('2026-09-08T10:00:00', { steps: 12 })]);
    await rememberDay('2026-09-08', [sample('2026-09-08T11:00:00', { steps: 30 })]);

    const stored = await loadDay('2026-09-08');
    expect(stored?.samples).toHaveLength(2);
    expect(stored?.samples.map((item) => item.steps)).toEqual([12, 30]);
  });

  it('повтор той же минуты не удваивает её', async () => {
    await rememberDay('2026-09-08', [sample('2026-09-08T10:00:00', { steps: 12 })]);
    await rememberDay('2026-09-08', [sample('2026-09-08T10:00:30', { steps: 18 })]);

    const stored = await loadDay('2026-09-08');
    expect(stored?.samples).toHaveLength(1);
    expect(stored?.samples[0]?.steps).toBe(18);
  });

  it('адрес устройства сохраняется, когда его не передали повторно', async () => {
    await rememberDay('2026-09-08', [], 'aa:bb');
    await rememberDay('2026-09-08', [sample('2026-09-08T10:00:00')]);
    expect((await loadDay('2026-09-08'))?.mac).toBe('aa:bb');
  });

  it('несохранённые сутки читаются как пусто, а не падают', async () => {
    expect(await loadDay('2020-01-01')).toBeNull();
  });
});
