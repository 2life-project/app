import { ago, sourceRows } from './sources';

const NOW = new Date('2026-09-10T12:00:00Z');

describe('sourceRows', () => {
  it('подключённый источник — с точкой и давностью синхронизации', () => {
    const rows = sourceRows(
      [
        {
          id: 'whoop',
          connected: true,
          lastSyncedAt: NOW.getTime() - 5 * 60_000,
          counts: { cycles: 12, sleeps: 0 },
        },
      ],
      NOW,
    );

    expect(rows[0]).toMatchObject({
      title: 'Whoop',
      connected: true,
      subtitle: 'synced 5 min ago · 12 cycles',
    });
  });

  // Не прочитавшееся состояние — не «отключён»: выдать одно за другое
  // значит сказать человеку, что его трекер отвалился.
  it('непрочитанное состояние не выдаётся за отключение', () => {
    const rows = sourceRows(
      [{ id: 'oura', connected: false, lastSyncedAt: null, counts: {}, unknown: true }],
      NOW,
    );

    expect(rows[0]?.subtitle).toBe('status did not load');
  });
});

describe('ago', () => {
  it('называет давность словами', () => {
    expect(ago(NOW.getTime() - 30_000, NOW)).toBe('just now');
    expect(ago(NOW.getTime() - 3 * 60 * 60_000, NOW)).toBe('3 h ago');
    expect(ago(NOW.getTime() - 26 * 60 * 60_000, NOW)).toBe('yesterday');
  });
});
