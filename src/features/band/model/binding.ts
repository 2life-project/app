import AsyncStorage from '@react-native-async-storage/async-storage';

import { currentUser } from '@/core/auth';
import { HttpError } from '@/core/http/client';
import { logger } from '@/core/log/logger';
import { requestId } from '@/shared/lib/id';

import { disconnectBand, registerBand, uuidFrom, type BandLimits, type DeviceInfo } from '../api';

/**
 * Кому и под какой версией привязки уезжают данные браслета.
 *
 * Привязка на сервере — это тройка «аккаунт, устройство, установка
 * приложения», и все три обязаны участвовать в ключе. Телефоном пользуются
 * двое: накопленную одним человеком очередь нельзя отправить от имени
 * второго — приёмник примет её как его измерения, и разделить их потом будет
 * нечем.
 */

/** Идентификатор установки приложения. Один на все аккаунты этого телефона. */
const INSTALL_KEY = '2life:band-install';

const BINDING_PREFIX = '2life:band-binding.1:';

export type Binding = {
  /** Идентификатор браслета на сервере. */
  bandId: string;
  /** Адрес устройства: им привязка ключуется и у нас, и на сервере. */
  mac: string;
  bindingVersion: number;
  limits: BandLimits;
  clientInstanceId: string;
  /**
   * Эпоха часов устройства. Меняется, когда часы браслета пришлось поправить
   * заметно: до этой правки его отметки времени лежат на другой шкале, и
   * склеивать их с последующими нельзя.
   */
  epoch: string | null;
  /**
   * Когда привязка заведена. По ней выбирается действующая, если у аккаунта
   * их несколько — после перепривязки устройства: порядок ключей хранилища
   * ничего не гарантирует, а сутки и записи должны уехать в последнюю.
   */
  boundAt: string;
};

/**
 * Насколько часы устройства должны разойтись с телефоном, чтобы считать это
 * сменой эпохи, а не дрейфом. Минута выбрана по сетке данных: история
 * приходит поминутно, и расхождение меньше минуты оставляет замер в своей
 * минуте, а большее — переносит в соседнюю.
 */
const EPOCH_SKEW_SECONDS = 60;

let install: string | null = null;

/** Идентификатор установки. Создаётся один раз и переживает выход из аккаунта. */
export async function clientInstanceId(): Promise<string> {
  if (install !== null) return install;

  const stored = await AsyncStorage.getItem(INSTALL_KEY).catch(() => null);
  if (stored !== null) {
    install = stored;
    return stored;
  }

  const created = requestId();
  install = created;
  await AsyncStorage.setItem(INSTALL_KEY, created).catch((failure: unknown) =>
    logger.error('band: идентификатор установки не сохранился', { failure }),
  );
  return created;
}

/**
 * Ключ привязки. Аккаунт в нём обязателен: очередь принадлежит человеку, а не
 * телефону, и после смены аккаунта не должна находиться заново.
 */
function keyOf(account: string, mac: string): string {
  return `${BINDING_PREFIX}${account}:${mac.toLowerCase()}`;
}

export async function storedBinding(account: string, mac: string): Promise<Binding | null> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(account, mac));
    return raw === null ? null : (JSON.parse(raw) as Binding);
  } catch (failure) {
    // Без привязки отправка молча стоит, поэтому это ошибка, а не шум.
    logger.error('band: привязка не прочиталась', { failure });
    return null;
  }
}

/**
 * Убедиться, что браслет зарегистрирован на сервере, и вернуть его привязку.
 *
 * Повторная регистрация того же адреса — не ошибка, а обычный случай: приёмник
 * отвечает на неё той же строкой. Поэтому спрашиваем сервер и на первом
 * подключении, и после переустановки приложения — версия привязки живёт у
 * него, а не у нас, и придумывать её нельзя.
 *
 * `null` означает «отправлять пока некуда»: нет входа, нет адреса устройства
 * или сервер недоступен. Это не ошибка данных — очередь просто ждёт.
 */
export async function ensureBinding(
  info: DeviceInfo | undefined,
  clockSkewSeconds: number | null,
): Promise<Binding | null> {
  const account = currentUser()?.sub;
  if (!account) return null;

  const mac = info?.mac;
  if (!mac) {
    // Без адреса устройство неотличимо от любого другого: сервер ключует
    // привязку по нему, а платформенный идентификатор iOS у каждого телефона
    // свой. Молчать здесь нельзя — вся выгрузка тихо не работала бы.
    logger.error('band: адрес устройства неизвестен, регистрация невозможна');
    return null;
  }

  const known = await storedBinding(account, mac);
  const epoch = epochOf(known, mac, clockSkewSeconds);

  // Регистрируемся один раз, а не при каждом подключении. Версию привязки
  // ведёт сервер, и лишний запрос на регистрацию — это лишний повод её
  // сдвинуть: уже замороженные пачки после сдвига стали бы неотправимыми.
  if (known) {
    if (known.epoch !== epoch)
      await AsyncStorage.setItem(keyOf(account, mac), JSON.stringify({ ...known, epoch }));
    return { ...known, epoch };
  }

  const instance = await clientInstanceId();

  try {
    const registered = await registerBand(instance, {
      mac,
      platform: info.platform,
      hardware: info.hardware,
      firmware: info.firmware,
      protocol: info.protocol,
      system: info.system,
      serial: info.serial,
    });

    const binding: Binding = {
      bandId: registered.id,
      mac,
      bindingVersion: registered.bindingVersion,
      limits: registered.limits,
      clientInstanceId: instance,
      epoch,
      boundAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(keyOf(account, mac), JSON.stringify(binding));
    return binding;
  } catch (failure) {
    // Очередь просто ждёт: данные уже в ней, регистрация повторится при
    // следующем чтении. Отказ сервера уже записан клиентом; сетевой — нет, а
    // в релизе виден только `error`.
    if (failure instanceof HttpError) {
      logger.warn('band: регистрация на сервере не прошла', { status: failure.status });
    } else {
      logger.error('band: регистрация не дошла до сервера', { reason: String(failure) });
    }
    return null;
  }
}

/**
 * Забыть, что мы знали о привязке, оставив очередь на месте.
 *
 * Нужно, когда сервер отвечает, что версия привязки у него уже другая: наша
 * копия устарела, и следующее подключение обязано спросить его заново.
 */
export async function dropStoredBinding(account: string, mac: string): Promise<void> {
  await AsyncStorage.removeItem(keyOf(account, mac)).catch((failure: unknown) =>
    logger.error('band: устаревшая привязка не стёрлась', { failure }),
  );
}

/**
 * Все привязки этого аккаунта.
 *
 * Нужны отправке: она ходит и из фоновой задачи, где ни экрана, ни связи с
 * устройством нет, а очередь всё равно надо разгрузить.
 */
export async function bindingsOfAccount(account: string): Promise<Binding[]> {
  const prefix = `${BINDING_PREFIX}${account}:`;
  const bindings: Binding[] = [];

  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    for (const [, raw] of await AsyncStorage.multiGet(keys)) {
      if (raw !== null) bindings.push(JSON.parse(raw) as Binding);
    }
  } catch (failure) {
    // Без списка привязок отправка молча стоит — это ошибка хранилища, не шум.
    logger.error('band: привязки не прочитались', { failure });
  }
  return bindings;
}

/**
 * Действующая привязка аккаунта — последняя заведённая. Браслет у человека
 * один, но после перепривязки устройства на диске их может оказаться две, и
 * дочитанные сутки с записями обязаны уехать в новую.
 */
export async function latestBinding(account: string): Promise<Binding | null> {
  const bindings = await bindingsOfAccount(account);
  return bindings.sort((a, b) => (b.boundAt ?? '').localeCompare(a.boundAt ?? ''))[0] ?? null;
}

/**
 * Эпоха часов. Новая заводится, когда часы устройства пришлось поправить
 * заметно: прочитанная в этом сеансе история писалась по старым часам.
 */
function epochOf(known: Binding | null, mac: string, skewSeconds: number | null): string | null {
  if (skewSeconds === null) return known?.epoch ?? null;
  if (Math.abs(skewSeconds) <= EPOCH_SKEW_SECONDS) return known?.epoch ?? uuidFrom(`epoch|${mac}`);

  // Имя эпохи считается из момента правки: два сброса подряд обязаны дать
  // разные эпохи, иначе приёмник склеит два разных отсчёта времени в один.
  return uuidFrom(`epoch|${mac}|${new Date().toISOString()}`);
}

/** Часы разошлись настолько, что времени в прочитанной истории веры нет. */
export function clockWasReset(skewSeconds: number | null): boolean {
  return skewSeconds !== null && Math.abs(skewSeconds) > EPOCH_SKEW_SECONDS;
}

/**
 * Сказать серверу, что этот браслет больше ничего не пришлёт.
 *
 * Вызывается, когда человек забывает устройство. История на сервере остаётся:
 * отключение закрывает приём, а не стирает измеренное.
 */
export async function releaseBinding(mac: string | undefined): Promise<void> {
  const account = currentUser()?.sub;
  if (!account || !mac) return;

  const binding = await storedBinding(account, mac);
  // Без ожидания: это кнопка «забыть браслет», и держать её до ответа сервера
  // с его пятнадцатисекундным сроком нельзя. Не дошло — история на сервере
  // остаётся открытой для приёма, и ничего страшного в этом нет.
  if (binding) {
    void disconnectBand(binding.bandId, binding.bindingVersion).catch((failure: unknown) =>
      logger.warn('band: сервер не подтвердил отключение', { reason: String(failure) }),
    );
  }

  await AsyncStorage.removeItem(keyOf(account, mac)).catch((failure: unknown) =>
    logger.error('band: привязка не стёрлась', { failure }),
  );
}
