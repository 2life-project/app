import { act, renderHook } from '@testing-library/react-native';

import { clearFatal, installFatalHandler, useFatal } from './fatal';
import { logger } from './logger';

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

/** Смонтированный экран ошибки: без подписчика показывать падение некому. */
function mountScreen() {
  return renderHook(() => useFatal());
}

describe('перехват фатальной ошибки', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    // Через `act`: экран ещё смонтирован, и сброс перерисовывает его.
    await act(async () => clearFatal());
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
  });

  it('забирает фатальную ошибку себе, а не системе', async () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();
    const screen = await mountScreen();

    await act(async () => fire(new TypeError('нет поля date'), true));

    expect(system).not.toHaveBeenCalled();
    expect(screen.result.current?.error.message).toBe('нет поля date');
  });

  it('снимает след в момент падения', async () => {
    const fire = fakeErrorUtils(jest.fn());
    installFatalHandler();
    const screen = await mountScreen();
    logger.debug('до падения');

    await act(async () => fire(new Error('всё'), true));
    logger.debug('после падения');

    const trail = screen.result.current?.trail ?? [];
    expect(trail.some((line) => line.includes('до падения'))).toBe(true);
    expect(trail.some((line) => line.includes('после падения'))).toBe(false);
  });

  // Worklet бросает на каждом кадре: без этого повтор за полсекунды вытеснил бы
  // из следа всё, что было до падения.
  it('вторую ошибку подряд отдаёт системе и след не трогает', async () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();
    const screen = await mountScreen();

    await act(async () => fire(new Error('первая'), true));
    await act(async () => fire(new Error('вторая'), true));

    expect(screen.result.current?.error.message).toBe('первая');
    expect(system).toHaveBeenCalledTimes(1);
  });

  // Проглотить ошибку, когда её некому показать, значит подменить падение с
  // отчётом на сплэш навсегда.
  it('без смонтированного экрана отдаёт ошибку системе', async () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();

    await act(async () => fire(new Error('до первой отрисовки'), true));

    expect(system).toHaveBeenCalledTimes(1);
  });

  // Нефатальное приложение переживает само: перехватывать его значит менять
  // поведение там, где ничего не сломалось.
  it('нефатальную отдаёт системе', async () => {
    const system = jest.fn();
    const fire = fakeErrorUtils(system);
    installFatalHandler();
    await mountScreen();

    await act(async () => fire(new Error('шум'), false));

    expect(system).toHaveBeenCalledTimes(1);
  });

  it('строку превращает в ошибку — экрану нужно имя и сообщение', async () => {
    const fire = fakeErrorUtils(jest.fn());
    installFatalHandler();
    const screen = await mountScreen();

    await act(async () => fire('всё сломалось', true));

    expect(screen.result.current?.error.message).toBe('всё сломалось');
  });

  it('без глобала React Native ничего не ставит и не падает', () => {
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;

    expect(() => installFatalHandler()).not.toThrow();
  });
});
