import { logger, logTrail } from './logger';

// Релизное окружение целиком: в нём `console` молчит на всём, кроме ошибок, —
// и ровно там след обязан продолжать писаться. Иначе диагностическая сборка
// приедет с пустым экраном вместо причины. `jest.mock` поднимается выше
// импортов сборщиком, поэтому подмена успевает встать до загрузки модуля.
jest.mock('@/core/config/env', () => ({
  env: { apiUrl: 'https://example.test', isDev: false, appVersion: '1.0.0' },
}));

describe('след логов в релизе', () => {
  it('пишет заглушённые уровни в след, но не в консоль', () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    logger.debug('Запрос', { key: 'home:2026-09-09' });

    const trail = logTrail();
    expect(trail[trail.length - 1]).toContain('Запрос');
    expect(debug).not.toHaveBeenCalled();

    debug.mockRestore();
  });
});
