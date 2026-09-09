import { logger, logTrail } from './logger';

/** След копится между тестами, поэтому смотрим на последнюю запись. */
function last(): string {
  const trail = logTrail();
  return trail[trail.length - 1] ?? '';
}

describe('след логов', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('пишет уровень, сообщение и нагрузку', () => {
    logger.debug('Запрос', { key: 'home:2026-09-09' });

    expect(last()).toContain('d Запрос');
    expect(last()).toContain('home:2026-09-09');
  });

  it('держит только последние тридцать строк', () => {
    for (let index = 0; index < 35; index += 1) logger.debug(`шаг ${index}`);

    expect(logTrail()).toHaveLength(30);
    expect(logTrail()[0]).toContain('шаг 5');
    expect(last()).toContain('шаг 34');
  });

  // В нагрузку кладут пойманную ошибку — она обязана дойти до следа читаемой.
  it('разворачивает ошибку в имя и сообщение', () => {
    logger.error('Отказ', { error: new TypeError('нет поля date') });

    expect(last()).toContain('TypeError: нет поля date');
  });

  it('не падает на нагрузке, которую нельзя сериализовать', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => logger.debug('Кольцо', circular)).not.toThrow();
    expect(last()).toContain('self');
  });
});
