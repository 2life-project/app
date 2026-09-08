import { BleManager, State } from 'react-native-ble-plx';

/**
 * Единственный на приложение менеджер BLE. Второй экземпляр — это второй
 * центральный: сканирования и подписки начинают спорить за радио, а отключения
 * приходят не в тот объект, который их ждёт.
 *
 * Создаётся лениво: сам конструктор поднимает стек Bluetooth и на iOS может
 * показать системный запрос, а спрашивать разрешение на старте приложения,
 * когда человек ещё не дошёл до браслета, нельзя.
 */
let manager: BleManager | null = null;

export function ble(): BleManager {
  return (manager ??= new BleManager());
}

/** Готово ли радио. Всё остальное — «включите Bluetooth», а не ошибка поиска. */
export function isReady(state: State): boolean {
  return state === State.PoweredOn;
}

/**
 * Сколько ждать, пока поднимется стек Bluetooth.
 *
 * Сразу после запуска приложения и сразу после выдачи разрешения состояние
 * радио — `Unknown`: система ещё не ответила. Если принять это за отказ, человек
 * увидит «нет доступа» ровно в тот момент, когда доступ только что дал, а
 * подключение к запомненному устройству провалится на каждом холодном старте.
 */
const STATE_TIMEOUT_MS = 5000;

export function waitForRadio(): Promise<State> {
  return new Promise((resolve) => {
    const subscription = ble().onStateChange((state) => {
      if (state === State.Unknown || state === State.Resetting) return;
      subscription.remove();
      resolve(state);
    }, true);

    setTimeout(() => {
      subscription.remove();
      resolve(State.Unknown);
    }, STATE_TIMEOUT_MS);
  });
}
