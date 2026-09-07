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
