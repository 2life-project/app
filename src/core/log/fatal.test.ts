import { clearFatal, installFatalHandler } from './fatal';

type Handler = (error: unknown, isFatal?: boolean) => void;

/** Подмена глобала React Native: в тестовой среде его нет. */
function fakeErrorUtils(system: Handler) {
  let current = system;
  (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
    getGlobalHandler: () => current,
    setGlobalHandler: (handler: Handler) => {
      current = handler;
    },
  };
  return (error: unknown, isFatal?: boolean) => current(error, isFatal);
}

describe('перехват фатальной ошибки', () => {
  let logged: jest.SpyInstance;

  beforeEach(() => {
    logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearFatal();
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
  });

  it('забирает фатальную ошибку себе, а не системе', () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();

    fire(new TypeError('нет поля date'), true);

    expect(system).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith(
      'Фатальная ошибка',
      expect.objectContaining({ name: 'TypeError', message: 'нет поля date' }),
    );
  });

  // Нефатальное приложение переживает само: перехватывать его значит менять
  // поведение там, где ничего не сломалось.
  it('нефатальную отдаёт системе', () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();

    fire(new Error('шум'), false);

    expect(system).toHaveBeenCalledTimes(1);
  });

  it('строку превращает в ошибку — экрану нужно имя и сообщение', () => {
    const fire = fakeErrorUtils(jest.fn());
    installFatalHandler();

    fire('всё сломалось', true);

    expect(logged).toHaveBeenCalledWith(
      'Фатальная ошибка',
      expect.objectContaining({ message: 'всё сломалось' }),
    );
  });

  it('без глобала React Native ничего не ставит и не падает', () => {
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;

    expect(() => installFatalHandler()).not.toThrow();
  });
});
