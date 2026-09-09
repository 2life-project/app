import { Mode, encode } from './frame';

/**
 * Команды, которые меняют устройство необратимо.
 *
 * Вынесены отдельным файлом намеренно: они соседствуют с безобидными по номерам
 * полей — сброс к заводским настройкам отличается от вибрации поиска одной
 * цифрой (`A5 AB 02` против `A5 AB 04`). Отдельный вход и говорящие имена
 * снижают шанс вызвать не то.
 *
 * Ни одна из них не должна вызываться без явного подтверждения человеком.
 */

const System = 0xa5;
const Account = 0xe7;
const Recorder = 0x01;

/** Сброс к заводским настройкам: стирает настройки и данные на браслете. */
export function factoryReset(): Uint8Array {
  return encode(System, Mode.write, 0x02, Uint8Array.from([0x01]));
}

/** Заводской сброс подсистемы диктофона: удаляет все записи. */
export function recorderFactoryReset(): Uint8Array {
  return Uint8Array.from([Recorder, 0x66, 0x00]);
}

/** Снять привязку к текущему аккаунту — браслет станет доступен другому телефону. */
export function unbind(): Uint8Array {
  return encode(Account, Mode.write, 0x03, Uint8Array.from([0x01]));
}

/** Стереть идентификатор аккаунта, сохранённый в устройстве. */
export function clearAccount(): Uint8Array {
  return encode(Account, Mode.write, 0x05, Uint8Array.from([0x01]));
}

/** Запросить сопряжение заново. */
export function requestPairing(): Uint8Array {
  return encode(Account, Mode.write, 0x02, Uint8Array.from([0x01]));
}

/** Отвязать диктофон от приложения. */
export function unbindRecorder(): Uint8Array {
  return Uint8Array.from([Recorder, 0x05, 0x00, 0x01]);
}

/**
 * Пароль на устройство. Шесть цифр по байту на каждую; пустой список снимает
 * пароль. Забытый пароль снимается только заводским сбросом.
 */
export function setPassword(digits: readonly number[]): Uint8Array {
  if (digits.length === 0) return encode(System, Mode.write, 0x0c, Uint8Array.from([0x00]));
  if (digits.length !== 6) throw new Error('пароль браслета состоит ровно из шести цифр');

  return encode(
    System,
    Mode.write,
    0x0c,
    Uint8Array.from([0x01, ...digits.map((digit) => digit & 0x0f)]),
  );
}
